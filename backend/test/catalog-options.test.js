const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeSizes,normalizeAddOnGroups,normalizeUnavailableOptionIds}=require('../platform/catalog-options');
const {resolveMenu}=require('../platform/menu');

const sizes=[{id:'size-small',name:'Small',priceAmount:'12.5'}];
const groups=[{id:'milk-group',name:'Milk options',selection:'single',options:[{id:'oat-milk',name:'Oat milk',priceAmount:'2'}]}];

test('normalizes and validates product size and add-on price data',()=>{
 const ids=new Set();
 assert.deepEqual(normalizeSizes(sizes,ids),[{id:'size-small',name:'Small',priceAmount:'12.50'}]);
 assert.deepEqual(normalizeAddOnGroups(groups,ids),[{id:'milk-group',name:'Milk options',selection:'single',options:[{id:'oat-milk',name:'Oat milk',priceAmount:'2.00'}]}]);
 assert.throws(()=>normalizeSizes([{id:'size-small',name:'Large',priceAmount:'15'}],ids),/identifiers must be unique/);
 assert.throws(()=>normalizeSizes([{id:'invalid.id',name:'Large',priceAmount:'15'}]),/only letters/);
 assert.throws(()=>normalizeAddOnGroups([{...groups[0],selection:'unlimited'}]),/single or multiple/);
 assert.throws(()=>normalizeAddOnGroups([{...groups[0],options:[{id:'oat-milk',name:'Oat',priceAmount:'1.999'}]}]),/decimal/);
});

test('unavailable option identifiers must belong to a product and be unique',()=>{
 const ids=new Set(['size-small','oat-milk']);
 assert.deepEqual(normalizeUnavailableOptionIds(['size-small'],ids),['size-small']);
 assert.throws(()=>normalizeUnavailableOptionIds(['unknown'],ids),/belonging to this product/);
 assert.throws(()=>normalizeUnavailableOptionIds(['size-small','size-small'],ids),/unique identifiers/);
});

test('published menu includes per-size and add-on availability for customer display',async()=>{
 const db={
  storeBrand:{findUnique:async()=>({
   id:'assignment-1',brandId:'brand-1',status:'active',
   store:{id:'store-1',status:'active',org:{status:'active'}},
   brand:{id:'brand-1',name:'Coffee',slug:'coffee',currency:'AED',timezone:'Asia/Dubai',status:'active',org:{status:'active'}},
   overrides:[{productId:'latte',unavailableOptionIds:['size-large','oat-milk']}]
  })},
  category:{findMany:async()=>[{
   id:'drinks',code:'drinks',name:'Drinks',isActive:true,products:[{
    id:'latte',name:'Latte',priceAmount:'10.00',currency:'AED',isActive:true,
    sizes:[{id:'size-small',name:'Small',priceAmount:'10.00'},{id:'size-large',name:'Large',priceAmount:'14.00'}],
    addOnGroups:[{id:'milk-group',name:'Milk options',selection:'single',options:[{id:'oat-milk',name:'Oat milk',priceAmount:'2.00'}]}],
    createdAt:new Date('2026-01-01'),updatedAt:new Date('2026-01-01')
   }]
  }]}
 };
 const menu=await resolveMenu(db,'assignment-1');
 assert.equal(menu.categories[0].items[0].sizes[0].available,true);
 assert.equal(menu.categories[0].items[0].sizes[1].available,false);
 assert.equal(menu.categories[0].items[0].addOnGroups[0].options[0].available,false);
});
