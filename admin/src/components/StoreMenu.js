import {useState} from 'react';
import {useCatalog} from '../data/CatalogContext';
import {platformService} from '../services/api';
function OverrideRow({product,override,onSave}){
 const [price,setPrice]=useState(override?.priceAmount??''),[soldOut,setSoldOut]=useState(override?.isSoldOut===true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <tr><td>{product.title}</td><td>{product.price}</td><td><input aria-label={'Local price for '+product.title} value={price} onChange={e=>setPrice(e.target.value)} placeholder="Inherit base price" inputMode="decimal"/></td><td><label><input type="checkbox" checked={soldOut} onChange={e=>setSoldOut(e.target.checked)}/> Sold out</label></td><td><button className="btn btn-primary btn-sm" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onSave({priceAmount:price===''?null:price,isSoldOut:soldOut});}catch(e){setError(e.error||'Could not save override.');}finally{setBusy(false);}}}>Save draft</button>{error&&<p role="alert">{error}</p>}</td></tr>;
}
export default function StoreMenu({brand,storeId,assignments,onSelectStore}){
 const {products}=useCatalog(),[message,setMessage]=useState(''),[preview,setPreview]=useState(null),[audit,setAudit]=useState(null),[busy,setBusy]=useState(false);
 const selected=assignments.find(a=>a.storeId===storeId);
 const prefix='/brands/'+brand.id;
 const action=async fn=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.error||'Could not complete the action.');}finally{setBusy(false);}};
 return <div className="page-container"><h2 className="section-title">Store menus — {brand.name}</h2><p>Base catalog edits are shared across locations. Local overrides change only the selected store. Tablets update after publishing.</p>
  <div className="scope-selectors"><label>Physical store<select aria-label="Physical store" value={storeId} onChange={e=>onSelectStore(e.target.value)}><option value="">Choose a store</option>{assignments.filter(a=>a.status==='active').map(a=><option key={a.id} value={a.storeId}>{a.store.name}{a.unpublishedChanges?' — Unpublished changes':''}</option>)}</select></label>
  <button className="btn btn-primary" disabled={busy||!assignments.some(a=>a.status==='active')} onClick={()=>action(async()=>{await platformService.post(prefix+'/publish',{});setMessage('Published to all active stores.');})}>Publish to all stores</button><button className="btn btn-ghost" onClick={()=>action(async()=>setAudit(await platformService.get(prefix+'/audit-log')))}>Audit log</button></div>
  {message&&<p role="status">{message}</p>}{selected&&<><div className="store-actions"><button className="btn btn-ghost" disabled={busy} onClick={()=>action(async()=>setPreview(await platformService.get(prefix+'/stores/'+storeId+'/preview')))}>Preview draft</button><button className="btn btn-primary" disabled={busy} onClick={()=>action(async()=>{await platformService.post(prefix+'/stores/'+storeId+'/publish',{});setMessage('Published to '+selected.store.name+'.');})}>Publish to this store</button></div>
  <table className="menu-table"><thead><tr><th>Product</th><th>Base price</th><th>Local price</th><th>Availability</th><th>Action</th></tr></thead><tbody>{products.map(p=><OverrideRow key={p._id} product={p} override={selected.overrides?.find(o=>o.productId===p._id)} onSave={async data=>{await platformService.put(prefix+'/stores/'+storeId+'/items/'+p._id+'/override',data);setMessage('Override saved as a draft. Publish this store to update tablets.');}}/>)}</tbody></table>
  </>}{preview&&<div className="ledger-card"><h3>Draft preview</h3>{preview.categories.map(c=><section key={c.id}><h4>{c.name}</h4>{c.items.map(p=><p key={p.id}>{p.name} — {p.currency} {Number(p.priceAmount).toFixed(2)} {p.availability==='soldout'?' · Sold out':''}</p>)}</section>)}</div>}
  {audit&&<div className="ledger-card"><h3>Recent changes</h3>{audit.map(a=><p key={a.id}>{new Date(a.at).toLocaleString()} · {a.entity} · {a.action}</p>)}</div>}
 </div>;
}
