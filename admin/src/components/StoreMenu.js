import {Fragment,useState} from 'react';
import {useCatalog} from '../data/CatalogContext';
import {platformService} from '../services/api';
import {displayPrice} from '../utils/price';
function OverrideRow({product,override,onSave}){
 const [price,setPrice]=useState(override?.priceAmount??''),[soldOut,setSoldOut]=useState(override?.isSoldOut===true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const hasSizes=product.sizes?.length>0;
 return <tr><td>{product.title}</td><td>{hasSizes?<div className="store-size-prices">{product.sizes.map(size=><span key={size.id}>{size.name}: {displayPrice(`${product.currency||'AED'} ${size.priceAmount}`)}</span>)}</div>:product.price}</td><td>{hasSizes?'Set per size in product catalog':<input aria-label={'Local price for '+product.title} value={price} onChange={e=>setPrice(e.target.value)} placeholder="Inherit base price" inputMode="decimal"/>}</td><td><label><input type="checkbox" checked={soldOut} onChange={e=>setSoldOut(e.target.checked)}/> Sold out</label></td><td><button className="btn btn-primary btn-sm" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onSave({...(!hasSizes?{priceAmount:price===''?null:price}:{}),isSoldOut:soldOut});}catch(e){setError(e.error||'Could not save override.');}finally{setBusy(false);}}}>Save draft</button>{error&&<p role="alert">{error}</p>}</td></tr>;
}
function OptionAvailabilityRow({product,override,onSave}){
 const optionIds=[...(product.sizes||[]).map(size=>size.id),...(product.addOnGroups||[]).flatMap(group=>group.options.map(option=>option.id))];
 const [unavailable,setUnavailable]=useState(override?.unavailableOptionIds||[]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const toggle=id=>setUnavailable(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
 if(!optionIds.length)return null;
 const options=[
  ...(product.sizes||[]).map(size=>({id:size.id,name:size.name,kind:'Size'})),
  ...(product.addOnGroups||[]).flatMap(group=>group.options.map(option=>({id:option.id,name:option.name,kind:group.name})))
 ];
 return <tr className="store-options-row"><td colSpan="5"><div className="store-option-availability"><strong>Size and add-on availability</strong><div className="store-option-list">{options.map(option=><label key={option.id}><input type="checkbox" checked={!unavailable.includes(option.id)} onChange={()=>toggle(option.id)}/><span>{option.kind}: {option.name}</span></label>)}</div><button className="btn btn-ghost btn-sm" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onSave({unavailableOptionIds:unavailable});}catch(e){setError(e.error||'Could not save option availability.');}finally{setBusy(false);}}}>Save option availability</button>{error&&<p role="alert">{error}</p>}</div></td></tr>;
}
export default function StoreMenu({brand,storeId,assignments,onSelectStore,branchScoped=false,onBack}){
 const {products}=useCatalog(),[message,setMessage]=useState(''),[preview,setPreview]=useState(null),[audit,setAudit]=useState(null),[busy,setBusy]=useState(false);
 const selected=assignments.find(a=>a.storeId===storeId);
 const prefix='/brands/'+brand.id;
 const action=async fn=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.error||'Could not complete the action.');}finally{setBusy(false);}};
 return <div className="page-container">{branchScoped&&onBack&&<button className="btn btn-ghost branch-back" onClick={onBack}>← Back to store</button>}<h2 className="section-title">{branchScoped?`${selected?.store.name||'Store'} — ${brand.name} menu`:`Store menus — ${brand.name}`}</h2><p>Changes here apply only to this store. Set a local price or availability, then publish to update its tablet. Product details and new items are managed in the shared brand catalog.</p>
  <div className="scope-selectors">{!branchScoped&&<label>Physical store<select aria-label="Physical store" value={storeId} onChange={e=>onSelectStore(e.target.value)}><option value="">Choose a store</option>{assignments.filter(a=>a.status==='active').map(a=><option key={a.id} value={a.storeId}>{a.store.name}{a.unpublishedChanges?' — Unpublished changes':''}</option>)}</select></label>}
  {!branchScoped&&<button className="btn btn-primary" disabled={busy||!assignments.some(a=>a.status==='active')} onClick={()=>action(async()=>{await platformService.post(prefix+'/publish',{});setMessage('Published to all active stores.');})}>Publish to all stores</button>}<button className="btn btn-ghost" onClick={()=>action(async()=>setAudit(await platformService.get(prefix+'/audit-log')))}>Audit log</button></div>
  {message&&<p role="status">{message}</p>}{selected&&<><div className="store-actions"><button className="btn btn-ghost" disabled={busy} onClick={()=>action(async()=>setPreview(await platformService.get(prefix+'/stores/'+storeId+'/preview')))}>Preview draft</button><button className="btn btn-primary" disabled={busy} onClick={()=>action(async()=>{await platformService.post(prefix+'/stores/'+storeId+'/publish',{});setMessage('Published to '+selected.store.name+'.');})}>Publish to this store</button></div>
  <table className="menu-table"><thead><tr><th>Product</th><th>Price / sizes</th><th>Store price</th><th>Availability</th><th>Action</th></tr></thead><tbody>{products.map(p=>{const override=selected.overrides?.find(o=>o.productId===p._id);const save=async data=>{await platformService.put(prefix+'/stores/'+storeId+'/items/'+p._id+'/override',data);setMessage('Store changes saved as a draft. Publish this store to update its tablet.');};return <Fragment key={p._id}><OverrideRow product={p} override={override} onSave={save}/><OptionAvailabilityRow product={p} override={override} onSave={save}/></Fragment>;})}</tbody></table>
  </>}{preview&&<div className="ledger-card"><h3>Draft preview</h3>{preview.categories.map(c=><section key={c.id}><h4>{c.name}</h4>{c.items.map(p=><div key={p.id}><p>{p.name}{p.availability==='soldout'?' · Sold out':''}</p>{p.sizes?.length?p.sizes.map(size=><p key={size.id}>{size.name}: {p.currency} {Number(size.priceAmount).toFixed(2)}{size.available?'':' · Unavailable'}</p>):<p>{p.currency} {Number(p.priceAmount).toFixed(2)}</p>}{p.addOnGroups?.map(group=><p key={group.id}>{group.name}: {group.options.map(option=>`${option.name} (+${p.currency} ${Number(option.priceAmount).toFixed(2)})${option.available?'':' · Unavailable'}`).join(', ')}</p>)}</div>)}</section>)}</div>}
  {audit&&<div className="ledger-card"><h3>Recent changes</h3>{audit.map(a=><p key={a.id}>{new Date(a.at).toLocaleString()} · {a.entity} · {a.action}</p>)}</div>}
 </div>;
}
