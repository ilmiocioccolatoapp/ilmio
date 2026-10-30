import { useEffect, useMemo, useState } from 'react';
import { platformService } from '../services/api';

const emptyBrand = { name: '', slug: '', currency: 'AED', timezone: 'Asia/Dubai' };
const emptyBranch = { name: '', slug: '', loginCode: '', password: '', address: '', timezone: 'Asia/Dubai' };

export default function BrandProvisioning({ organizations, brands, selectedOrg, onChanged }) {
  const [orgId, setOrgId] = useState(selectedOrg?.id || organizations[0]?.id || '');
  const [brandList, setBrandList] = useState(brands);
  const [brandForm, setBrandForm] = useState(emptyBrand);
  const [ownerName, setOwnerName] = useState('');
  const [adminBrandId, setAdminBrandId] = useState('');
  const [invite, setInvite] = useState({ email: '', name: '' });
  const [admins, setAdmins] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [branchBrand, setBranchBrand] = useState(null);
  const [branchAssignments, setBranchAssignments] = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState('');
  const [branchForm, setBranchForm] = useState(emptyBranch);

  useEffect(() => setBrandList(brands), [brands]);
  useEffect(() => {
    if (!organizations.some(org => org.id === orgId)) {
      setOrgId(selectedOrg?.id || organizations[0]?.id || '');
    }
  }, [organizations, orgId, selectedOrg?.id]);

  const adminBrand = useMemo(
    () => brandList.find(brand => brand.id === adminBrandId) || brandList[0],
    [adminBrandId, brandList]
  );

  useEffect(() => {
    setAdmins([]);
    if (!adminBrand) return undefined;
    let active = true;
    platformService.get(`/brands/${adminBrand.id}/admins`)
      .then(data => { if (active) setAdmins(data); })
      .catch(error => { if (active) setMessage(error.error || 'Could not load brand administrators.'); });
    return () => { active = false; };
  }, [adminBrand]);

  const run = async (action, successMessage = 'Changes saved.') => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      await onChanged();
      setMessage(result?.membership
        ? (result.inviteSent
          ? 'Invitation email sent. The administrator sets their own password.'
          : 'Existing Supabase account received brand administrator access.')
        : successMessage);
      return result;
    } catch (error) {
      setMessage(error.error || error.message || 'Could not complete this action.');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const submit = action => event => {
    event.preventDefault();
    run(action);
  };

  const createBrand = async () => {
    const created = await platformService.post('/brands', { ...brandForm, orgId });
    setBrandList(current => current.some(brand => brand.id === created.id)
      ? current
      : [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setAdminBrandId(created.id);
    setBrandForm(emptyBrand);
    return created;
  };

  const edit = brand => {
    setEditingBrand(brand);
    setEditForm({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
      primaryColor: brand.primaryColor || '#8B4513',
      currency: brand.currency,
      timezone: brand.timezone
    });
  };

  const saveBrand = event => {
    event.preventDefault();
    run(async () => {
      const updated = await platformService.put(`/brands/${editingBrand.id}/settings`, {
        ...editForm,
        logoUrl: editForm.logoUrl || null
      });
      setBrandList(current => current.map(brand => brand.id === updated.id ? updated : brand));
      setAdminBrandId(updated.id);
      setEditingBrand(null);
      return updated;
    }, 'Brand updated.');
  };

  const deleteBrand = brand => {
    if (!window.confirm(`Delete "${brand.name}" (${brand.slug})? Remove its branches and products first. This cannot be undone.`)) return;
    run(async () => {
      await platformService.remove(`/brands/${brand.id}`);
      setBrandList(current => current.filter(item => item.id !== brand.id));
      if (adminBrandId === brand.id) setAdminBrandId('');
      return null;
    }, 'Brand deleted.');
  };

  const openBranches = async brand => {
    setBranchBrand(brand);
    setBranchAssignments([]);
    setBranchError('');
    setBranchLoading(true);
    try {
      setBranchAssignments(await platformService.get(`/brands/${brand.id}/stores`));
    } catch (error) {
      setBranchError(error.error || 'Could not load this brand’s branches.');
    } finally {
      setBranchLoading(false);
    }
  };

  const createBranch = event => {
    event.preventDefault();
    run(async () => {
      await platformService.post(`/brands/${branchBrand.id}/stores`, branchForm);
      setBranchAssignments(await platformService.get(`/brands/${branchBrand.id}/stores`));
      setBranchForm(emptyBranch);
      return null;
    }, 'Branch created and assigned to this brand.');
  };

  const inviteAdmin = event => {
    event.preventDefault();
    run(async () => {
      const result = await platformService.post(`/brands/${adminBrand.id}/admins`, invite);
      setInvite({ email: '', name: '' });
      setAdmins(await platformService.get(`/brands/${adminBrand.id}/admins`));
      return result;
    });
  };

  return (
    <div className="page-container brand-provisioning">
      <h1 className="section-title">Brands</h1>
      <p>Manage each brand, its branches, and its administrators.</p>
      {message && <p role="status">{message}</p>}

      <section className="ledger-card" aria-labelledby="brand-list-heading">
        <h2 id="brand-list-heading">All brands</h2>
        {brandList.length === 0 ? <p>No brands yet.</p> : (
          <div className="brand-list">
            {brandList.map(brand => (
              <article className="store-record brand-record" key={brand.id}>
                <div>
                  <strong>{brand.name || 'Unnamed brand'}</strong>
                  <span className="brand-slug"> · {brand.slug}</span>
                  <p>{organizations.find(org => org.id === brand.orgId)?.name || 'Owner not found'}</p>
                </div>
                <div className="store-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openBranches(brand)}>
                    Manage Branches
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit(brand)}>
                    Edit Brand
                  </button>
                  <button type="button" className="btn btn-ghost-danger btn-sm" onClick={() => deleteBrand(brand)} disabled={busy}>
                    Delete Brand
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="ledger-card">
        <h2>Create owner organization</h2>
        <form onSubmit={submit(async () => {
          const owner = await platformService.post('/orgs', { name: ownerName });
          setOwnerName('');
          setOrgId(owner.id);
          return null;
        })}>
          <label>Owner / business name
            <input required value={ownerName} onChange={event => setOwnerName(event.target.value)} />
          </label>
          <button className="btn btn-ghost" disabled={busy}>Create owner</button>
        </form>
      </section>

      <section className="ledger-card">
        <h2>Create brand</h2>
        <label>Owner organization
          <select aria-label="Brand owner" required value={orgId} onChange={event => setOrgId(event.target.value)}>
            {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        </label>
        <form onSubmit={submit(createBrand)}>
          <label>Brand name
            <input required value={brandForm.name} onChange={event => setBrandForm({ ...brandForm, name: event.target.value })} />
          </label>
          <label>Brand slug
            <input required value={brandForm.slug} onChange={event => setBrandForm({ ...brandForm, slug: event.target.value })} />
          </label>
          <label>Currency
            <select value={brandForm.currency} onChange={event => setBrandForm({ ...brandForm, currency: event.target.value })}>
              {['AED', 'EUR', 'USD', 'GBP'].map(currency => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          <label>Timezone
            <input required value={brandForm.timezone} onChange={event => setBrandForm({ ...brandForm, timezone: event.target.value })} />
          </label>
          <button className="btn btn-primary" disabled={busy || !orgId}>Create brand</button>
        </form>
      </section>

      <section className="ledger-card">
        <h2>Brand administrators</h2>
        <label>Brand
          <select aria-label="Administrator brand" value={adminBrand?.id || ''} onChange={event => setAdminBrandId(event.target.value)}>
            {brandList.map(brand => <option key={brand.id} value={brand.id}>{brand.name} ({brand.slug})</option>)}
          </select>
        </label>
        {adminBrand ? (
          <>
            <form onSubmit={inviteAdmin}>
              <label>Administrator email
                <input type="email" required value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })} />
              </label>
              <label>Name (optional)
                <input value={invite.name} onChange={event => setInvite({ ...invite, name: event.target.value })} />
              </label>
              <button className="btn btn-primary" disabled={busy}>Invite brand administrator</button>
            </form>
            <h3>Current administrators</h3>
            {admins.length === 0 && <p>No brand administrators yet.</p>}
            {admins.map(member => (
              <div className="store-record" key={member.id}>
                <strong>{member.profile.name || member.profile.email}</strong>
                <p>{member.profile.email} · {member.profile.status}</p>
                <div className="store-actions">
                  <button className="btn btn-ghost btn-sm" disabled={busy || member.profile.status !== 'active'} onClick={() => run(async () => {
                    await platformService.post(`/brands/${adminBrand.id}/admins/${member.id}/resend-invite`, {});
                    return null;
                  })}>Resend setup email</button>
                  <button className="btn btn-ghost-danger btn-sm" disabled={busy} onClick={() => {
                    if (window.confirm(`Remove ${member.profile.email} from ${adminBrand.name}?`)) {
                      run(async () => {
                        await platformService.remove(`/brands/${adminBrand.id}/admins/${member.id}`);
                        setAdmins(await platformService.get(`/brands/${adminBrand.id}/admins`));
                        return null;
                      });
                    }
                  }}>Remove access</button>
                </div>
              </div>
            ))}
          </>
        ) : <p>Create a brand before inviting its administrators.</p>}
      </section>

      {editingBrand && (
        <div className="modal-overlay" role="presentation">
          <section className="ledger-card store-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-brand-title">
            <h2 id="edit-brand-title">Edit brand: {editingBrand.name}</h2>
            <form onSubmit={saveBrand}>
              <label>Brand name
                <input required value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value })} />
              </label>
              <label>Brand slug
                <input readOnly value={editForm.slug} />
              </label>
              <label>Logo URL
                <input type="url" value={editForm.logoUrl} onChange={event => setEditForm({ ...editForm, logoUrl: event.target.value })} />
              </label>
              <label>Primary color
                <input type="color" value={editForm.primaryColor} onChange={event => setEditForm({ ...editForm, primaryColor: event.target.value })} />
              </label>
              <label>Currency
                <select value={editForm.currency} onChange={event => setEditForm({ ...editForm, currency: event.target.value })}>
                  {['AED', 'EUR', 'USD', 'GBP'].map(currency => <option key={currency}>{currency}</option>)}
                </select>
              </label>
              <label>Timezone
                <input required value={editForm.timezone} onChange={event => setEditForm({ ...editForm, timezone: event.target.value })} />
              </label>
              <div className="store-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingBrand(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={busy}>Save brand</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {branchBrand && (
        <div className="modal-overlay" role="presentation">
          <section className="ledger-card store-dialog" role="dialog" aria-modal="true" aria-labelledby="brand-branches-title">
            <h2 id="brand-branches-title">{branchBrand.name} branches</h2>
            <button type="button" className="btn btn-ghost" onClick={() => setBranchBrand(null)}>Close</button>
            {branchLoading ? <p role="status">Loading branches…</p> : branchError ? <p role="alert">{branchError}</p> : (
              <ul>
                {branchAssignments.map(assignment => (
                  <li key={assignment.id}>
                    {assignment.store.name} · {assignment.store.status} · assignment {assignment.status}
                  </li>
                ))}
                {branchAssignments.length === 0 && <li>No branches assigned yet.</li>}
              </ul>
            )}
            <h3>Add new branch to this brand</h3>
            <form onSubmit={createBranch}>
              <label>Branch name
                <input required value={branchForm.name} onChange={event => setBranchForm({ ...branchForm, name: event.target.value })} />
              </label>
              <label>Branch slug
                <input required value={branchForm.slug} onChange={event => setBranchForm({ ...branchForm, slug: event.target.value })} />
              </label>
              <label>Tablet Store ID
                <input required value={branchForm.loginCode} onChange={event => setBranchForm({ ...branchForm, loginCode: event.target.value })} />
              </label>
              <label>Tablet password (at least 6 characters)
                <input type="password" required minLength={6} value={branchForm.password} onChange={event => setBranchForm({ ...branchForm, password: event.target.value })} />
              </label>
              <label>Address
                <input value={branchForm.address} onChange={event => setBranchForm({ ...branchForm, address: event.target.value })} />
              </label>
              <label>Timezone
                <input required value={branchForm.timezone} onChange={event => setBranchForm({ ...branchForm, timezone: event.target.value })} />
              </label>
              <button className="btn btn-primary" disabled={busy || branchLoading}>+ Add New Branch to this Brand</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
