import { useState } from 'react';
import { CheckIcon } from './Icons';
import { DIRHAM_SYMBOL } from '../utils/price';

const Settings = () => {
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  const handleSave = (e) => {
    e.preventDefault();
    if (saveStatus !== 'idle') return;

    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 450);
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Store Configuration</h2>
          <p className="section-subtitle">Operational parameters, currency designations, and kiosk behavior</p>
        </div>
      </div>

      <div className="ledger-card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Bakehouse & Store Name</label>
            <input type="text" defaultValue="Il Mio Cioccolato" />
          </div>

          <div className="form-group">
            <label>Administrative Contact Email</label>
            <input type="email" defaultValue="admin@ilmiocioccolato.com" />
          </div>

          <div className="form-group">
            <label>Primary Accounting Currency</label>
            <select defaultValue="AED">
              <option value="AED">{DIRHAM_SYMBOL} (United Arab Emirates Dirham)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="USD">USD ($ US Dollar)</option>
            </select>
          </div>

          <div style={{ marginTop: '28px', marginBottom: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <label className="checkbox-ledger">
              <input type="checkbox" defaultChecked />
              <span>Enable Customer Online Ordering Channel</span>
            </label>

            <label className="checkbox-ledger">
              <input type="checkbox" defaultChecked />
              <span>Display Out-of-Stock Creations on Kiosk with “Suspended” Stamp</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              type="submit"
              className={`btn btn-save-interaction ${saveStatus === 'saved' ? 'btn-success saved' : 'btn-primary'}`}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' && <span>Recording...</span>}
              {saveStatus === 'saved' && (
                <>
                  <CheckIcon />
                  <span>Saved to Ledger</span>
                </>
              )}
              {saveStatus === 'idle' && <span>Save Settings</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
