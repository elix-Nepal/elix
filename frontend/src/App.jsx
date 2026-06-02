import { useState, useEffect, useRef } from "react";

const API = "https://elix-production.up.railway.app";

const C = {
  bg:'#070707', surface:'#0d0d0d', card:'#111111',
  border:'#222222', text:'#ede9e2', muted:'#7a766e', silver:'#c4c0b8',
  gold:'#c9a76c', goldDim:'#c9a76c22', goldLight:'#e8d4a0',
};
const F = { D:"'Cormorant Garamond',Georgia,serif", B:"'Jost',system-ui,sans-serif" };

const TIERS = [
  {min:3,max:4,pct:5},{min:5,max:9,pct:10},
  {min:10,max:19,pct:15},{min:20,max:Infinity,pct:20}
];
const getDisc = qty => (TIERS.find(t=>qty>=t.min&&qty<=t.max)||{pct:0}).pct;

async function call(path, opts={}) {
  const token = localStorage.getItem('elix_token');
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(API+path, {
    headers:{
      ...(!isFormData?{'Content-Type':'application/json'}:{}),
      ...(token?{Authorization:`Bearer ${token}`}:{})
    },
    ...opts,
    body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error||'Request failed');
  return data;
}

function Btn({children,fill,small,full,danger,disabled,onClick,sx={}}) {
  const [h,sH] = useState(false);
  return <button disabled={disabled} style={{
    display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,
    padding:small?'5px 13px':'0.68rem 1.75rem',
    fontSize:small?'0.6rem':'0.68rem',letterSpacing:'0.18em',textTransform:'uppercase',
    cursor:disabled?'not-allowed':'pointer',fontFamily:F.B,fontWeight:400,
    width:full?'100%':undefined,opacity:disabled?0.5:1,transition:'all 0.2s',
    border:danger?`1px solid #8a3a3a55`:fill?`1px solid ${C.gold}`:`1px solid ${C.border}`,
    background:fill?(h?C.goldLight:C.gold):danger?(h?'#2a0a0a':'transparent'):(h?'#141414':'transparent'),
    color:fill?C.bg:danger?'#c47070':(h?C.text:C.muted),...sx
  }} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}>
    {children}
  </button>;
}

function Field({label,value,onChange,type='text',placeholder,required,as,rows,options}) {
  const base={width:'100%',background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:'0.65rem 1rem',fontSize:'0.88rem',fontFamily:F.B,outline:'none',boxSizing:'border-box'};
  return <div style={{marginBottom:'0.95rem'}}>
    {label&&<label style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,display:'block',marginBottom:5,fontFamily:F.B}}>
      {label}{required&&<span style={{color:C.gold}}> *</span>}
    </label>}
    {as==='textarea'?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows||4} style={{...base,resize:'vertical'}}/>
    :as==='select'?<select value={value} onChange={e=>onChange(e.target.value)} style={base}>
      {options?.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
    :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
  </div>;
}

function Badge({s}) {
  const map={new:['#1a3a5c','#4a8ac4'],processing:['#2a220a','#c9a76c'],shipped:['#0a2a1a','#4a9a6a'],delivered:['#0a2a1a','#4a9a6a'],cancelled:['#2a0a0a','#c47070'],pending:['#1a1a2a','#7070c4'],paid:['#0a2a1a','#4a9a6a']};
  const [bg,c]=map[s]||map.new;
  return <span style={{padding:'2px 9px',fontSize:'0.58rem',letterSpacing:'0.12em',textTransform:'uppercase',background:bg,color:c,border:`1px solid ${c}44`,fontFamily:F.B,whiteSpace:'nowrap'}}>{s}</span>;
}

function Modal({children,onClose}) {
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:'2rem',maxWidth:600,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      {children}
    </div>
  </div>;
}

function Nav({page,setPage,cartCount}) {
  return <nav style={{position:'sticky',top:0,zIndex:50,background:'rgba(7,7,7,0.97)',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 2rem',height:58}}>
    <button onClick={()=>setPage('home')} style={{fontFamily:F.D,fontSize:'1.6rem',fontWeight:300,letterSpacing:'0.14em',color:C.text,border:'none',background:'none',cursor:'pointer'}}>ELIX</button>
    <div style={{display:'flex',gap:'1.75rem',alignItems:'center'}}>
      {[['shop','Shop'],['bulk','Bulk'],['custom','Custom']].map(([id,l])=>(
        <button key={id} onClick={()=>setPage(id)} style={{fontSize:'0.65rem',letterSpacing:'0.16em',textTransform:'uppercase',color:page===id?C.text:C.muted,cursor:'pointer',border:'none',background:'none',fontFamily:F.B,transition:'color 0.2s'}}>{l}</button>
      ))}
      <button onClick={()=>setPage('cart')} style={{display:'flex',alignItems:'center',gap:7,fontSize:'0.65rem',letterSpacing:'0.16em',textTransform:'uppercase',color:page==='cart'?C.text:C.muted,cursor:'pointer',border:'none',background:'none',fontFamily:F.B}}>
        Cart {cartCount>0&&<span style={{background:C.gold,color:C.bg,borderRadius:'50%',width:17,height:17,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.58rem',fontWeight:500}}>{cartCount}</span>}
      </button>
    </div>
  </nav>;
}

function ProductCard({p,onAdd,onClick}) {
  const [h,sH]=useState(false);
  const sym={Ring:'◯',Necklace:'⛓',Earrings:'◎',Bracelet:'⌒'};
  const imgSrc=p.image_url?(p.image_url.startsWith('/')?API+p.image_url:p.image_url):null;
  return <div style={{background:h?'#161616':C.card,position:'relative',transition:'background 0.2s',cursor:'pointer'}}
    onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={()=>onClick(p)}>
    <div style={{height:200,background:C.surface,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
      {imgSrc?<img src={imgSrc} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',transform:h?'scale(1.04)':'scale(1)',transition:'transform 0.4s'}}/>
      :<span style={{fontSize:'3rem',color:h?C.silver:'#444',transition:'color 0.3s'}}>{sym[p.category]||'◈'}</span>}
    </div>
    <div style={{padding:'1rem 1.1rem 1.1rem'}}>
      <p style={{fontFamily:F.D,fontSize:'1rem',color:C.text,marginBottom:3}}>{p.name}</p>
      <p style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,marginBottom:'0.65rem',fontFamily:F.B}}>{p.category} · Silver .925</p>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:'0.85rem',color:C.gold}}>NPR {p.price.toLocaleString()}</span>
        <Btn small onClick={e=>{e.stopPropagation();onAdd(p);}}>+ Add</Btn>
      </div>
    </div>
  </div>;
}
function ProductDetail({p,onAdd,onClose}) {
  const sym={Ring:'◯',Necklace:'⛓',Earrings:'◎',Bracelet:'⌒'};
  const imgSrc=p.image_url?(p.image_url.startsWith('/')?API+p.image_url:p.image_url):null;
  const [added,setAdded]=useState(false);
  const handleAdd=()=>{
    onAdd(p);
    setAdded(true);
    setTimeout(()=>setAdded(false),2000);
  };
  return <Modal onClose={onClose}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'2rem',alignItems:'start'}}>
      {/* Image */}
      <div style={{height:280,background:C.surface,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {imgSrc?<img src={imgSrc} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        :<span style={{fontSize:'5rem',color:'#555'}}>{sym[p.category]||'◈'}</span>}
      </div>
      {/* Info */}
      <div>
        <p style={{fontSize:'0.62rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C.gold,marginBottom:'0.5rem',fontFamily:F.B}}>{p.category}</p>
        <p style={{fontFamily:F.D,fontSize:'1.8rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'0.5rem'}}>{p.name}</p>
        <p style={{fontFamily:F.D,fontSize:'1.5rem',color:C.gold,marginBottom:'1.25rem'}}>NPR {p.price.toLocaleString()}</p>
        <div style={{width:40,height:1,background:C.border,marginBottom:'1.25rem'}}/>
        {p.description&&<p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.8,marginBottom:'1.5rem',fontFamily:F.B}}>{p.description}</p>}
        <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
          {[['Material','Silver .925'],['Category',p.category],['Stock',p.stock>0?'In Stock':'Out of Stock']].map(([k,v])=>(
            <div key={k} style={{background:C.surface,border:`1px solid ${C.border}`,padding:'0.5rem 0.85rem'}}>
              <p style={{fontSize:'0.58rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,marginBottom:2,fontFamily:F.B}}>{k}</p>
              <p style={{fontSize:'0.78rem',color:C.text,fontFamily:F.B}}>{v}</p>
            </div>
          ))}
        </div>
        <Btn fill full onClick={handleAdd}>{added?'Added to Cart ✓':'Add to Cart'}</Btn>
        <p style={{fontSize:'0.65rem',color:C.muted,marginTop:'0.75rem',textAlign:'center',fontFamily:F.B}}>
          Buy 3+ items for automatic bulk discount
        </p>
      </div>
    </div>
  </Modal>;
}
function HomePage({setPage,products,addToCart}) {
  const [selected,setSelected]=useState(null);
  return <div>
    {selected&&<ProductDetail p={selected} onAdd={addToCart} onClose={()=>setSelected(null)}/>}
    <div style={{padding:'5.5rem 2rem 3.5rem',maxWidth:860,margin:'0 auto'}}>
      <p style={{fontSize:'0.62rem',letterSpacing:'0.32em',textTransform:'uppercase',color:C.gold,marginBottom:'1.25rem',fontFamily:F.B}}>Sterling Silver · Handcrafted · Nepal</p>
      <h1 style={{fontFamily:F.D,fontSize:'clamp(2.8rem,6vw,5rem)',fontWeight:300,lineHeight:1.05,color:C.text,fontStyle:'italic',marginBottom:'1.25rem'}}>Wear what<br/>endures.</h1>
      <p style={{fontSize:'0.85rem',color:C.muted,lineHeight:1.8,maxWidth:440,marginBottom:'2.25rem',fontFamily:F.B}}>Elix is a curated collection of pure .925 silver pieces — minimal in form, deliberate in craft, made to last a lifetime.</p>
      <div style={{display:'flex',gap:'0.85rem',flexWrap:'wrap'}}>
        <Btn fill onClick={()=>setPage('shop')}>Shop Collection</Btn>
        <Btn onClick={()=>setPage('custom')}>Custom Order →</Btn>
      </div>
    </div>
    <div style={{borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,padding:'1rem 2rem'}}>
      <div style={{display:'flex',justifyContent:'center',gap:'3rem',flexWrap:'wrap'}}>
        {['Silver .925 Silver','Ships Across Nepal','Bulk Pricing Available','Custom Pieces Made to Order'].map(f=>(
          <span key={f} style={{fontSize:'0.62rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C.muted,fontFamily:F.B}}>{f}</span>
        ))}
      </div>
    </div>
    <div style={{padding:'4rem 2rem',maxWidth:1100,margin:'0 auto'}}>
      <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.6rem',fontFamily:F.B}}>New Arrivals</p>
      <h2 style={{fontFamily:F.D,fontSize:'2rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'2.25rem'}}>Featured Pieces</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:1,background:C.border}}>
        {products.slice(0,4).map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} onClick={setSelected}/>)}
      </div>
      <div style={{textAlign:'center',marginTop:'2.5rem'}}>
        <Btn onClick={()=>setPage('shop')}>View Full Collection</Btn>
      </div>
    </div>
    <div style={{borderTop:`1px solid ${C.border}`}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))'}}>
        <div style={{padding:'3.5rem 2rem',borderRight:`1px solid ${C.border}`}}>
          <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.85rem',fontFamily:F.B}}>For Retailers & Gifting</p>
          <h3 style={{fontFamily:F.D,fontSize:'1.8rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'0.85rem'}}>Bulk Orders</h3>
          <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.75,marginBottom:'1.75rem',fontFamily:F.B}}>Order 3+ pieces and unlock tiered discounts — up to 20% off.</p>
          <Btn onClick={()=>setPage('bulk')}>See Discount Tiers</Btn>
        </div>
        <div style={{padding:'3.5rem 2rem'}}>
          <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.85rem',fontFamily:F.B}}>Bespoke Silver</p>
          <h3 style={{fontFamily:F.D,fontSize:'1.8rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'0.85rem'}}>Custom Orders</h3>
          <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.75,marginBottom:'1.75rem',fontFamily:F.B}}>Specific design in mind? We craft to your exact specs with a small premium for extra craft.</p>
          <Btn fill onClick={()=>setPage('custom')}>Request a Piece</Btn>
        </div>
      </div>
    </div>
    <div style={{borderTop:`1px solid ${C.border}`,padding:'1.5rem 2rem',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
      <span style={{fontFamily:F.D,fontSize:'1.2rem',fontWeight:300,letterSpacing:'0.12em',color:C.muted}}>ELIX</span>
      <button onClick={()=>setPage('admin')} style={{fontSize:'0.6rem',letterSpacing:'0.15em',textTransform:'uppercase',color:'#2a2a2a',cursor:'pointer',border:'none',background:'none',fontFamily:F.B}}>admin</button>
    </div>
  </div>;
}

function ShopPage({products,addToCart}) {
  const [filter,setFilter]=useState('All');
  const [selected,setSelected]=useState(null);
  const cats=['All','Ring','Necklace','Earrings','Bracelet'];
  const visible=filter==='All'?products:products.filter(p=>p.category===filter);
  return <div style={{padding:'3.5rem 2rem',maxWidth:1100,margin:'0 auto'}}>
    {selected&&<ProductDetail p={selected} onAdd={addToCart} onClose={()=>setSelected(null)}/>}
    <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.6rem',fontFamily:F.B}}>Full Collection</p>
    <h2 style={{fontFamily:F.D,fontSize:'2.2rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'1.75rem'}}>All Pieces</h2>
    <div style={{display:'flex',gap:7,marginBottom:'2.25rem',flexWrap:'wrap'}}>
      {cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:'5px 16px',fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',cursor:'pointer',fontFamily:F.B,transition:'all 0.2s',border:`1px solid ${filter===c?C.gold:C.border}`,background:filter===c?C.goldDim:'transparent',color:filter===c?C.gold:C.muted}}>{c}</button>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:1,background:C.border}}>
      {visible.map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} onClick={setSelected}/>)}
    </div>
  </div>;
}

function BulkPage() {
  return <div style={{padding:'3.5rem 2rem',maxWidth:1000,margin:'0 auto'}}>
    <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.6rem',fontFamily:F.B}}>Wholesale & Gifting</p>
    <h2 style={{fontFamily:F.D,fontSize:'2.2rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'0.85rem'}}>Bulk Orders</h2>
    <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.75,maxWidth:560,marginBottom:'2.75rem',fontFamily:F.B}}>
      The more you order, the more you save. Discounts are applied automatically at checkout — no codes needed.
    </p>

    {/* Tier display */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:1,background:C.border,marginBottom:'2.5rem'}}>
      {TIERS.map(t=>(
        <div key={t.min} style={{background:C.card,padding:'1.5rem 1.25rem'}}>
          <p style={{fontSize:'0.6rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C.muted,marginBottom:'0.65rem',fontFamily:F.B}}>
            {t.max===Infinity?`${t.min}+ items`:`${t.min}–${t.max} items`}
          </p>
          <p style={{fontFamily:F.D,fontSize:'2.5rem',fontWeight:300,color:C.gold,lineHeight:1}}>{t.pct}%</p>
          <p style={{fontSize:'0.65rem',color:C.muted,marginTop:5,fontFamily:F.B}}>off</p>
        </div>
      ))}
    </div>

    {/* How it works */}
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:'1.75rem',maxWidth:560,marginBottom:'2rem'}}>
      <p style={{fontSize:'0.68rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C.muted,marginBottom:'1.25rem',fontFamily:F.B}}>How it works</p>
      {[
        ['Browse the shop','Add any products to your cart from the Shop page.'],
        ['Discount applies automatically','Once you have 3+ items in your cart, the discount activates at checkout. No codes needed.'],
        ['The more you buy, the more you save','Up to 20% off for orders of 20 or more pieces.'],
      ].map(([t,d])=>(
        <div key={t} style={{display:'flex',gap:12,marginBottom:'1.1rem'}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:C.gold,flexShrink:0,marginTop:7}}/>
          <div>
            <p style={{fontSize:'0.8rem',color:C.text,marginBottom:3,fontFamily:F.B}}>{t}</p>
            <p style={{fontSize:'0.75rem',color:C.muted,lineHeight:1.65,fontFamily:F.B}}>{d}</p>
          </div>
        </div>
      ))}
    </div>

    {/* 20+ contact notice */}
    <div style={{background:C.goldDim,border:`1px solid ${C.gold}44`,padding:'1.1rem 1.5rem',maxWidth:560}}>
      <p style={{fontSize:'0.78rem',color:C.gold,lineHeight:1.75,fontFamily:F.B}}>
        ✦ For orders of <strong>20+ pieces</strong>, contact us directly on our socials for a custom wholesale quote and priority handling.
      </p>
    </div>
  </div>;
}

function CustomPage() {
  const [form,setForm]=useState({name:'',email:'',phone:'',description:'',budget:'',type:'ring'});
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async()=>{
    if(!form.name||!form.phone||!form.description) return alert('Please fill in name, phone, and description.');
    setLoading(true);
    try { await call('/api/custom',{method:'POST',body:{name:form.name,email:form.email,phone:form.phone,type:form.type,description:form.description,budget:form.budget}}); setDone(true); }
    catch(e){alert(e.message);}
    setLoading(false);
  };
  return <div style={{padding:'3.5rem 2rem',maxWidth:1000,margin:'0 auto'}}>
    <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.6rem',fontFamily:F.B}}>Bespoke Silver</p>
    <h2 style={{fontFamily:F.D,fontSize:'2.2rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'2rem'}}>Custom Order</h2>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'2.5rem',alignItems:'start'}}>
      <div>
        <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.8,marginBottom:'1.1rem',fontFamily:F.B}}>Tell us exactly what you have in mind. We craft it in .925 sterling silver.</p>
        <div style={{background:C.goldDim,border:`1px solid ${C.gold}44`,padding:'0.9rem 1.1rem',marginBottom:'1.75rem'}}>
          <p style={{fontSize:'0.72rem',color:C.gold,lineHeight:1.7,fontFamily:F.B}}>✦ Custom pieces carry a 20–40% premium over catalogue pricing.</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          {['Ring','Necklace','Earrings','Bracelet','Other'].map(t=>(
            <div key={t} onClick={()=>upd('type',t.toLowerCase())} style={{display:'flex',alignItems:'center',gap:11,padding:'0.65rem 0.9rem',cursor:'pointer',border:`1px solid ${form.type===t.toLowerCase()?C.gold:C.border}`,background:form.type===t.toLowerCase()?C.goldDim:'transparent'}}>
              <div style={{width:11,height:11,borderRadius:'50%',flexShrink:0,border:`1px solid ${form.type===t.toLowerCase()?C.gold:C.muted}`,background:form.type===t.toLowerCase()?C.gold:'transparent'}}/>
              <span style={{fontSize:'0.8rem',color:form.type===t.toLowerCase()?C.text:C.muted,fontFamily:F.B}}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,padding:'1.75rem'}}>
        {!done?<>
          <Field label="Full Name" value={form.name} onChange={v=>upd('name',v)} placeholder="Your name" required/>
          <Field label="Phone / WhatsApp" value={form.phone} onChange={v=>upd('phone',v)} placeholder="+977 98XXXXXXXX" required type="tel"/>
          <Field label="Email" value={form.email} onChange={v=>upd('email',v)} placeholder="your@email.com" type="email"/>
          <Field label="Budget Range (NPR)" value={form.budget} onChange={v=>upd('budget',v)} placeholder="e.g. 5,000 – 10,000"/>
          <Field label="Describe Your Design" value={form.description} onChange={v=>upd('description',v)} placeholder="Style, finish, size, engraving, references..." required as="textarea" rows={5}/>
          <Btn fill full onClick={submit} disabled={loading}>{loading?'Submitting...':'Submit Request'}</Btn>
          <p style={{fontSize:'0.62rem',color:C.muted,marginTop:'0.85rem',textAlign:'center',fontFamily:F.B}}>We'll respond within 24–48 hours</p>
        </>:<div style={{textAlign:'center',padding:'2rem 0'}}>
          <p style={{fontFamily:F.D,fontSize:'1.8rem',color:C.gold,fontStyle:'italic',marginBottom:'0.85rem'}}>Thank you, {form.name.split(' ')[0]}!</p>
          <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.75,marginBottom:'1.75rem',fontFamily:F.B}}>Request received. We'll reach out within 24–48 hours.</p>
          <Btn onClick={()=>setDone(false)}>Submit Another</Btn>
        </div>}
      </div>
    </div>
  </div>;
}

function CartPage({cart,updateQty,remove,setPage}) {
  const [step,setStep]=useState('cart');
  const [orderNum,setOrderNum]=useState('');
  const [payment,setPayment]=useState('cod');
  const [customer,setCustomer]=useState({name:'',phone:'',email:'',address:'',city:'',notes:''});
  const [loading,setLoading]=useState(false);
  const upd=(k,v)=>setCustomer(c=>({...c,[k]:v}));
  const totalQty=cart.reduce((s,i)=>s+i.qty,0);
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const discPct=getDisc(totalQty);
  const discAmt=Math.round(subtotal*discPct/100);
  const total=subtotal-discAmt;
  const placeOrder=async()=>{
    if(!customer.name||!customer.phone||!customer.address||!customer.city) return alert('Please fill in all required fields.');
    setLoading(true);
    try {
      const r=await call('/api/orders',{method:'POST',body:{customer,items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),payment_method:payment,subtotal,discount_pct:discPct,discount_amount:discAmt,total}});
      setOrderNum(r.order_number); setStep('done');
    } catch(e){alert(e.message);}
    setLoading(false);
  };
  if(step==='done') return <div style={{padding:'5rem 2rem',textAlign:'center',maxWidth:560,margin:'0 auto'}}>
    <p style={{fontFamily:F.D,fontSize:'2.8rem',color:C.gold,fontStyle:'italic',marginBottom:'1.1rem'}}>Order Placed ✦</p>
    <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.8,marginBottom:'0.5rem',fontFamily:F.B}}>Order number: <span style={{color:C.text}}>{orderNum}</span></p>
    <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.8,marginBottom:'2.25rem',fontFamily:F.B}}>{payment==='cod'?'Your order is confirmed. Pay cash on delivery.':`You'll be redirected to ${payment==='esewa'?'eSewa':'Khalti'} to complete payment.`}</p>
    <Btn fill onClick={()=>{setStep('cart');setPage('home');}}>Back to Store</Btn>
  </div>;
  return <div style={{padding:'3.5rem 2rem',maxWidth:1050,margin:'0 auto'}}>
    <p style={{fontSize:'0.62rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C.gold,marginBottom:'0.6rem',fontFamily:F.B}}>{totalQty} {totalQty===1?'item':'items'}</p>
    <h2 style={{fontFamily:F.D,fontSize:'2.2rem',fontWeight:300,color:C.text,fontStyle:'italic',marginBottom:'2.5rem'}}>{step==='cart'?'Your Cart':'Delivery Details'}</h2>
    {cart.length===0?<div style={{textAlign:'center',padding:'4rem 0'}}>
      <p style={{color:C.muted,marginBottom:'1.75rem',fontFamily:F.B}}>Your cart is empty</p>
      <Btn onClick={()=>setPage('shop')}>Start Shopping</Btn>
    </div>:<div style={{display:'grid',gridTemplateColumns:'1fr minmax(280px,340px)',gap:'2.5rem',alignItems:'start'}}>
      <div>
        {step==='cart'?<>
          {cart.map(item=>(
            <div key={item.id} style={{display:'flex',gap:14,alignItems:'center',padding:'1.1rem 0',borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:58,height:58,background:C.card,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                {item.image_url?<img src={item.image_url.startsWith('/')?API+item.image_url:item.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                :<span style={{fontSize:'1.4rem',color:C.silver}}>{({Ring:'◯',Necklace:'⛓',Earrings:'◎',Bracelet:'⌒'})[item.category]||'◈'}</span>}
              </div>
              <div style={{flex:1}}>
                <p style={{fontFamily:F.D,fontSize:'0.95rem',color:C.text,marginBottom:2}}>{item.name}</p>
                <p style={{fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',color:C.muted,marginBottom:4,fontFamily:F.B}}>{item.category}</p>
                <p style={{fontSize:'0.8rem',color:C.gold,fontFamily:F.B}}>NPR {item.price.toLocaleString()}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <button onClick={()=>updateQty(item.id,item.qty-1)} style={{width:26,height:26,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer'}}>−</button>
                <span style={{minWidth:18,textAlign:'center',fontSize:'0.88rem',color:C.text,fontFamily:F.B}}>{item.qty}</span>
                <button onClick={()=>updateQty(item.id,item.qty+1)} style={{width:26,height:26,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer'}}>+</button>
                <button onClick={()=>remove(item.id)} style={{width:26,height:26,border:`1px solid #8a3a3a33`,background:'transparent',color:'#c47070',cursor:'pointer',fontSize:'0.65rem'}}>✕</button>
              </div>
            </div>
          ))}
          {discPct>0&&<div style={{padding:'0.8rem 1rem',background:'#12100a',border:`1px solid ${C.gold}33`,marginTop:'0.85rem'}}>
            <p style={{fontSize:'0.72rem',color:C.gold,fontFamily:F.B}}>✦ {totalQty} items — {discPct}% bulk discount active</p>
          </div>}
        </>:<>
          <p style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,marginBottom:'1.5rem',fontFamily:F.B}}>Delivery Information</p>
          <Field label="Full Name" value={customer.name} onChange={v=>upd('name',v)} placeholder="Your full name" required/>
          <Field label="Phone / WhatsApp" value={customer.phone} onChange={v=>upd('phone',v)} placeholder="+977 98XXXXXXXX" required type="tel"/>
          <Field label="Email" value={customer.email} onChange={v=>upd('email',v)} placeholder="your@email.com" type="email"/>
          <Field label="Delivery Address" value={customer.address} onChange={v=>upd('address',v)} placeholder="Street, Ward No., Tole..." required/>
          <Field label="City / District" value={customer.city} onChange={v=>upd('city',v)} placeholder="e.g. Bhaktapur, Kathmandu" required/>
          <Field label="Notes (optional)" value={customer.notes} onChange={v=>upd('notes',v)} placeholder="Any special delivery instructions..." as="textarea" rows={3}/>
        </>}
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,padding:'1.5rem',position:'sticky',top:70}}>
        <p style={{fontSize:'0.62rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C.muted,marginBottom:'1.25rem',fontFamily:F.B}}>Order Summary</p>
        {cart.map(i=>(
          <div key={i.id} style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontSize:'0.75rem',color:C.muted,fontFamily:F.B}}>{i.name} ×{i.qty}</span>
            <span style={{fontSize:'0.75rem',color:C.text,fontFamily:F.B}}>NPR {(i.price*i.qty).toLocaleString()}</span>
          </div>
        ))}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'0.85rem',marginTop:'0.5rem'}}>
          {discPct>0&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontSize:'0.75rem',color:C.muted,fontFamily:F.B}}>Discount ({discPct}%)</span>
            <span style={{fontSize:'0.75rem',color:C.gold,fontFamily:F.B}}>− NPR {discAmt.toLocaleString()}</span>
          </div>}
          <div style={{display:'flex',justifyContent:'space-between',paddingTop:'0.65rem',marginTop:6,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontFamily:F.B,fontWeight:500,color:C.text}}>Total</span>
            <span style={{color:C.gold,fontFamily:F.B,fontWeight:500}}>NPR {total.toLocaleString()}</span>
          </div>
        </div>
        {step==='checkout'&&<div style={{marginTop:'1.5rem'}}>
          <p style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,marginBottom:'0.85rem',fontFamily:F.B}}>Payment Method</p>
          {[{id:'cod',l:'Cash on Delivery',s:'Pay when your order arrives'},{id:'esewa',l:'eSewa',s:'Pay via eSewa wallet'},{id:'khalti',l:'Khalti',s:'Pay via Khalti wallet'}].map(m=>(
            <div key={m.id} onClick={()=>setPayment(m.id)} style={{padding:'0.65rem 0.9rem',marginBottom:7,cursor:'pointer',border:`1px solid ${payment===m.id?C.gold:C.border}`,background:payment===m.id?C.goldDim:'transparent',display:'flex',alignItems:'center',gap:11}}>
              <div style={{width:11,height:11,borderRadius:'50%',flexShrink:0,border:`1px solid ${payment===m.id?C.gold:C.muted}`,background:payment===m.id?C.gold:'transparent'}}/>
              <div>
                <p style={{fontSize:'0.8rem',color:payment===m.id?C.text:C.muted,margin:0,fontFamily:F.B}}>{m.l}</p>
                <p style={{fontSize:'0.65rem',color:C.muted,margin:0,fontFamily:F.B}}>{m.s}</p>
              </div>
            </div>
          ))}
        </div>}
        {step==='cart'?<Btn fill full onClick={()=>setStep('checkout')} sx={{marginTop:'1.25rem'}}>Continue to Checkout</Btn>
        :<Btn fill full onClick={placeOrder} disabled={loading} sx={{marginTop:'1.25rem'}}>{loading?'Placing...':'Place Order'}</Btn>}
        {step==='checkout'&&<button onClick={()=>setStep('cart')} style={{width:'100%',marginTop:8,background:'none',border:'none',color:C.muted,fontSize:'0.65rem',letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',fontFamily:F.B}}>← Back to Cart</button>}
      </div>
    </div>}
  </div>;
}

function AdminLogin({onLogin}) {
  const [pw,setPw]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const login=async()=>{
    setLoading(true);setErr('');
    try { const {token}=await call('/api/admin/login',{method:'POST',body:{password:pw}}); localStorage.setItem('elix_token',token); onLogin(); }
    catch{setErr('Wrong password.');}
    setLoading(false);
  };
  return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:'2.5rem',width:'100%',maxWidth:360}}>
      <p style={{fontFamily:F.D,fontSize:'2rem',color:C.text,fontStyle:'italic',marginBottom:'0.5rem'}}>Admin</p>
      <p style={{fontSize:'0.65rem',color:C.muted,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'2rem',fontFamily:F.B}}>Elix Dashboard</p>
      <Field label="Password" value={pw} onChange={setPw} type="password" placeholder="Enter admin password"/>
      {err&&<p style={{fontSize:'0.75rem',color:'#c47070',marginBottom:'0.75rem',fontFamily:F.B}}>{err}</p>}
      <Btn fill full onClick={login} disabled={loading}>{loading?'Logging in...':'Login'}</Btn>
    </div>
  </div>;
}

function AdminDashboard() {
  const [stats,setStats]=useState(null);
  useEffect(()=>{call('/api/admin/stats').then(setStats).catch(console.error);},[]);
  const cards=stats?[
    {l:'Total Orders',v:stats.totalOrders,c:C.gold},
    {l:'Revenue (NPR)',v:Number(stats.revenue).toLocaleString(),c:C.gold},
    {l:'Pending Orders',v:stats.pending,c:'#c47070'},
    {l:'Active Products',v:stats.products,c:C.silver},
    {l:'New Custom Requests',v:stats.customNew,c:'#7ab4d4'},
  ]:[];
  return <div style={{padding:'2rem'}}>
    <h2 style={{fontFamily:F.D,fontSize:'2rem',color:C.text,fontStyle:'italic',marginBottom:'2rem'}}>Dashboard</h2>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'1rem'}}>
      {cards.map(c=><div key={c.l} style={{background:C.card,border:`1px solid ${C.border}`,padding:'1.25rem'}}>
        <p style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,marginBottom:'0.65rem',fontFamily:F.B}}>{c.l}</p>
        <p style={{fontFamily:F.D,fontSize:'2.2rem',color:c.c,fontWeight:300}}>{c.v}</p>
      </div>)}
    </div>
    {!stats&&<p style={{color:C.muted,fontFamily:F.B,fontSize:'0.85rem',marginTop:'1rem'}}>Loading...</p>}
  </div>;
}

function AdminOrders() {
  const [orders,setOrders]=useState([]);
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState('all');
  const load=()=>call('/api/admin/orders').then(setOrders).catch(console.error);
  useEffect(()=>{load();},[]);
  const visible=filter==='all'?orders:orders.filter(o=>o.order_status===filter);
  const updateStatus=async(id,order_status,payment_status)=>{
    await call(`/api/admin/orders/${id}`,{method:'PATCH',body:{order_status,payment_status}});
    load();setSelected(null);
  };
  return <div style={{padding:'2rem'}}>
    <h2 style={{fontFamily:F.D,fontSize:'2rem',color:C.text,fontStyle:'italic',marginBottom:'1.5rem'}}>Orders</h2>
    <div style={{display:'flex',gap:7,marginBottom:'1.5rem',flexWrap:'wrap'}}>
      {['all','new','processing','shipped','delivered','cancelled'].map(s=>(
        <button key={s} onClick={()=>setFilter(s)} style={{padding:'4px 14px',fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',fontFamily:F.B,border:`1px solid ${filter===s?C.gold:C.border}`,background:filter===s?C.goldDim:'transparent',color:filter===s?C.gold:C.muted}}>{s}</button>
      ))}
    </div>
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem',fontFamily:F.B}}>
        <thead>
          <tr>{['Order #','Customer','Phone','City','Items','Total','Status','Payment','Date',''].map(h=>(
            <th key={h} style={{textAlign:'left',padding:'0.65rem 0.75rem',borderBottom:`1px solid ${C.border}`,fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',color:C.muted,whiteSpace:'nowrap'}}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {visible.map(o=>(
            <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:'0.75rem',color:C.gold}}>{o.order_number}</td>
              <td style={{padding:'0.75rem',color:C.text}}>{o.customer_name}</td>
              <td style={{padding:'0.75rem',color:C.muted}}>{o.customer_phone}</td>
              <td style={{padding:'0.75rem',color:C.muted}}>{o.city}</td>
              <td style={{padding:'0.75rem',color:C.muted,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.items_list}</td>
              <td style={{padding:'0.75rem',color:C.text,whiteSpace:'nowrap'}}>NPR {Number(o.total).toLocaleString()}</td>
              <td style={{padding:'0.75rem'}}><Badge s={o.order_status}/></td>
              <td style={{padding:'0.75rem'}}><Badge s={o.payment_status}/></td>
              <td style={{padding:'0.75rem',color:C.muted,whiteSpace:'nowrap'}}>{o.created_at?.slice(0,10)}</td>
              <td style={{padding:'0.75rem'}}><Btn small onClick={()=>setSelected(o)}>View</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length===0&&<p style={{color:C.muted,padding:'2rem',fontFamily:F.B,fontSize:'0.85rem',textAlign:'center'}}>No orders found</p>}
    </div>
    {selected&&<Modal onClose={()=>setSelected(null)}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'1.5rem'}}>
        <div>
          <p style={{fontFamily:F.D,fontSize:'1.5rem',color:C.gold,fontStyle:'italic'}}>{selected.order_number}</p>
          <p style={{fontSize:'0.65rem',color:C.muted,fontFamily:F.B,marginTop:3}}>{selected.created_at}</p>
        </div>
        <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'1.2rem'}}>✕</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1.5rem'}}>
        {[['Customer',selected.customer_name],['Phone',selected.customer_phone],['Email',selected.customer_email||'—'],['City',selected.city],['Address',selected.delivery_address],['Notes',selected.notes||'—'],['Payment',selected.payment_method],['Items',selected.items_list]].map(([k,v])=>(
          <div key={k} style={{marginBottom:'0.5rem'}}>
            <p style={{fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',color:C.muted,fontFamily:F.B,marginBottom:2}}>{k}</p>
            <p style={{fontSize:'0.85rem',color:C.text,fontFamily:F.B}}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',padding:'1rem',background:C.surface,marginBottom:'1.5rem'}}>
        <span style={{fontSize:'0.75rem',color:C.muted,fontFamily:F.B}}>Subtotal: NPR {Number(selected.subtotal).toLocaleString()}{selected.discount_amount>0?` · Discount: −NPR ${Number(selected.discount_amount).toLocaleString()}`:''}</span>
        <span style={{fontSize:'1rem',color:C.gold,fontFamily:F.D}}>Total: NPR {Number(selected.total).toLocaleString()}</span>
      </div>
      <p style={{fontSize:'0.65rem',letterSpacing:'0.12em',textTransform:'uppercase',color:C.muted,marginBottom:'0.75rem',fontFamily:F.B}}>Update Status</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
        {[['processing','Mark Processing'],['shipped','Mark Shipped'],['delivered','Mark Delivered'],['cancelled','Cancel Order']].map(([s,l])=>(
          <Btn key={s} small danger={s==='cancelled'} onClick={()=>updateStatus(selected.id,s,s==='delivered'?'paid':selected.payment_status)}>{l}</Btn>
        ))}
      </div>
    </Modal>}
  </div>;
}

function AdminProducts() {
  const [products,setProducts]=useState([]);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:'',category:'Ring',price:'',description:'',image_url:'',stock:'100'});
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef();
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const load=()=>call('/api/admin/products').then(setProducts).catch(console.error);
  useEffect(()=>{load();},[]);
  const openAdd=()=>{setEditing('new');setForm({name:'',category:'Ring',price:'',description:'',image_url:'',stock:'100'});};
  const openEdit=p=>{setEditing(p.id);setForm({name:p.name,category:p.category,price:String(p.price),description:p.description||'',image_url:p.image_url||'',stock:String(p.stock)});};
  const uploadImage=async file=>{
    setUploading(true);
    const fd=new FormData();fd.append('image',file);
    try{const{url}=await call('/api/admin/upload',{method:'POST',body:fd});upd('image_url',url);}
    catch(e){alert('Upload failed: '+e.message);}
    setUploading(false);
  };
  const save=async()=>{
    if(!form.name||!form.price) return alert('Name and price required.');
    try{
      if(editing==='new') await call('/api/admin/products',{method:'POST',body:form});
      else await call(`/api/admin/products/${editing}`,{method:'PUT',body:{...form,is_active:1}});
      load();setEditing(null);
    }catch(e){alert(e.message);}
  };
  const del=async id=>{
    if(!confirm('Remove this product?')) return;
    await call(`/api/admin/products/${id}`,{method:'DELETE'});load();
  };
  return <div style={{padding:'2rem'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
      <h2 style={{fontFamily:F.D,fontSize:'2rem',color:C.text,fontStyle:'italic'}}>Products</h2>
      <Btn fill onClick={openAdd}>+ Add Product</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:1,background:C.border}}>
      {products.map(p=>{
        const imgSrc=p.image_url?(p.image_url.startsWith('/')?API+p.image_url:p.image_url):null;
        return <div key={p.id} style={{background:p.is_active?C.card:'#0c0c0c',position:'relative'}}>
          <div style={{height:150,background:C.surface,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {imgSrc?<img src={imgSrc} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            :<span style={{fontSize:'2.5rem',color:'#333'}}>{({Ring:'◯',Necklace:'⛓',Earrings:'◎',Bracelet:'⌒'})[p.category]||'◈'}</span>}
          </div>
          <div style={{padding:'0.9rem 1rem'}}>
            <p style={{fontFamily:F.D,fontSize:'0.95rem',color:C.text,marginBottom:2}}>{p.name}</p>
            <p style={{fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',color:C.muted,marginBottom:'0.65rem',fontFamily:F.B}}>{p.category} · Stock: {p.stock}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'0.85rem',color:C.gold}}>NPR {Number(p.price).toLocaleString()}</span>
              <div style={{display:'flex',gap:6}}>
                <Btn small onClick={()=>openEdit(p)}>Edit</Btn>
                <Btn small danger onClick={()=>del(p.id)}>Del</Btn>
              </div>
            </div>
          </div>
        </div>;
      })}
    </div>
    {editing!==null&&<Modal onClose={()=>setEditing(null)}>
      <p style={{fontFamily:F.D,fontSize:'1.5rem',color:C.text,fontStyle:'italic',marginBottom:'1.5rem'}}>{editing==='new'?'Add Product':'Edit Product'}</p>
      <Field label="Product Name" value={form.name} onChange={v=>upd('name',v)} placeholder="e.g. Classic Band Ring" required/>
      <Field label="Category" value={form.category} onChange={v=>upd('category',v)} as="select" options={['Ring','Necklace','Earrings','Bracelet','Other']}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
        <Field label="Price (NPR)" value={form.price} onChange={v=>upd('price',v)} type="number" placeholder="2500" required/>
        <Field label="Stock" value={form.stock} onChange={v=>upd('stock',v)} type="number" placeholder="100"/>
      </div>
      <Field label="Description" value={form.description} onChange={v=>upd('description',v)} as="textarea" rows={3} placeholder="Brief product description..."/>
      <p style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C.muted,marginBottom:'0.5rem',fontFamily:F.B}}>Product Photo</p>
      {form.image_url&&<div style={{marginBottom:'0.75rem',height:120,overflow:'hidden',border:`1px solid ${C.border}`}}>
        <img src={form.image_url.startsWith('/')?API+form.image_url:form.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
      </div>}
      <div style={{display:'flex',gap:'0.5rem',alignItems:'flex-end',marginBottom:'1.5rem'}}>
        <div style={{flex:1}}><Field label="Or paste image URL" value={form.image_url} onChange={v=>upd('image_url',v)} placeholder="https://..."/></div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files[0]&&uploadImage(e.target.files[0])}/>
          <Btn onClick={()=>fileRef.current.click()} disabled={uploading} sx={{marginBottom:'0.95rem'}}>{uploading?'Uploading...':'Upload Photo'}</Btn>
        </div>
      </div>
      <div style={{display:'flex',gap:'0.75rem'}}>
        <Btn fill onClick={save}>Save Product</Btn>
        <Btn onClick={()=>setEditing(null)}>Cancel</Btn>
      </div>
    </Modal>}
  </div>;
}

function AdminCustom() {
  const [requests,setRequests]=useState([]);
  const [selected,setSelected]=useState(null);
  const [notes,setNotes]=useState('');
  const load=()=>call('/api/admin/custom').then(setRequests).catch(console.error);
  useEffect(()=>{load();},[]);
  const update=async(id,status)=>{
    await call(`/api/admin/custom/${id}`,{method:'PATCH',body:{status,admin_notes:notes}});
    load();setSelected(null);
  };
  return <div style={{padding:'2rem'}}>
    <h2 style={{fontFamily:F.D,fontSize:'2rem',color:C.text,fontStyle:'italic',marginBottom:'1.5rem'}}>Custom Requests</h2>
    <div style={{display:'flex',flexDirection:'column',gap:1,background:C.border}}>
      {requests.map(r=>(
        <div key={r.id} style={{background:C.card,padding:'1.25rem',display:'grid',gridTemplateColumns:'1fr auto',gap:'1rem',alignItems:'center'}}>
          <div>
            <div style={{display:'flex',gap:'0.75rem',alignItems:'center',marginBottom:6}}>
              <p style={{fontFamily:F.D,fontSize:'1rem',color:C.text}}>{r.customer_name}</p>
              <Badge s={r.status}/>
            </div>
            <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap',marginBottom:5}}>
              <span style={{fontSize:'0.72rem',color:C.muted,fontFamily:F.B}}>📞 {r.customer_phone}</span>
              {r.customer_email&&<span style={{fontSize:'0.72rem',color:C.muted,fontFamily:F.B}}>✉ {r.customer_email}</span>}
              <span style={{fontSize:'0.72rem',color:C.gold,fontFamily:F.B,textTransform:'capitalize'}}>{r.piece_type}</span>
              {r.budget&&<span style={{fontSize:'0.72rem',color:C.muted,fontFamily:F.B}}>Budget: {r.budget}</span>}
            </div>
            <p style={{fontSize:'0.78rem',color:C.muted,lineHeight:1.6,fontFamily:F.B}}>{r.description}</p>
          </div>
          <Btn small onClick={()=>{setSelected(r);setNotes(r.admin_notes||'');}}>Manage</Btn>
        </div>
      ))}
      {requests.length===0&&<p style={{color:C.muted,padding:'2rem',fontFamily:F.B,fontSize:'0.85rem',textAlign:'center'}}>No custom requests yet</p>}
    </div>
    {selected&&<Modal onClose={()=>setSelected(null)}>
      <p style={{fontFamily:F.D,fontSize:'1.5rem',color:C.text,fontStyle:'italic',marginBottom:'1rem'}}>Request from {selected.customer_name}</p>
      <p style={{fontSize:'0.82rem',color:C.muted,lineHeight:1.7,marginBottom:'1.5rem',fontFamily:F.B}}>{selected.description}</p>
      <Field label="Your Notes / Reply" value={notes} onChange={setNotes} as="textarea" rows={3} placeholder="Notes for this request..."/>
      <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
        {['processing','quoted','completed','cancelled'].map(s=>(
          <Btn key={s} small danger={s==='cancelled'} fill={s==='quoted'} onClick={()=>update(selected.id,s)}>Mark {s}</Btn>
        ))}
      </div>
    </Modal>}
  </div>;
}

function AdminPanel({onExit}) {
  const [section,setSection]=useState('dashboard');
  const logout=()=>{localStorage.removeItem('elix_token');onExit();};
  const nav=[{id:'dashboard',l:'Dashboard'},{id:'orders',l:'Orders'},{id:'products',l:'Products'},{id:'custom',l:'Custom Requests'}];
  return <div style={{minHeight:'100vh',background:C.bg,display:'flex'}}>
    <div style={{width:210,background:C.surface,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh'}}>
      <div style={{padding:'1.5rem',borderBottom:`1px solid ${C.border}`}}>
        <p style={{fontFamily:F.D,fontSize:'1.4rem',color:C.text,letterSpacing:'0.12em'}}>ELIX</p>
        <p style={{fontSize:'0.6rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C.muted,fontFamily:F.B}}>Admin Panel</p>
      </div>
      <div style={{flex:1,padding:'1rem 0'}}>
        {nav.map(n=><button key={n.id} onClick={()=>setSection(n.id)} style={{display:'block',width:'100%',textAlign:'left',padding:'0.75rem 1.5rem',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',color:section===n.id?C.text:C.muted,background:section===n.id?C.card:'transparent',cursor:'pointer',border:'none',fontFamily:F.B,borderRight:section===n.id?`2px solid ${C.gold}`:'2px solid transparent',transition:'all 0.2s'}}>{n.l}</button>)}
      </div>
      <div style={{padding:'1.5rem',borderTop:`1px solid ${C.border}`}}>
        <Btn full onClick={logout}>Logout</Btn>
        <button onClick={onExit} style={{display:'block',width:'100%',marginTop:8,background:'none',border:'none',color:'#444',fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',fontFamily:F.B}}>← Back to Store</button>
      </div>
    </div>
    <div style={{flex:1,overflowY:'auto'}}>
      {section==='dashboard'&&<AdminDashboard/>}
      {section==='orders'&&<AdminOrders/>}
      {section==='products'&&<AdminProducts/>}
      {section==='custom'&&<AdminCustom/>}
    </div>
  </div>;
}

export default function App() {
  const [page,setPage]=useState('home');
  const [products,setProducts]=useState([]);
  const [cart,setCart]=useState([]);
  const [adminAuth,setAdminAuth]=useState(!!localStorage.getItem('elix_token'));

  useEffect(()=>{
    call('/api/products').then(setProducts).catch(()=>{});
  },[]);

  const addToCart=p=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id);
      if(ex) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);
      return [...prev,{...p,qty:1}];
    });
  };
  const updateQty=(id,qty)=>{
    if(qty<1){setCart(p=>p.filter(i=>i.id!==id));return;}
    setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));
  };
  const remove=id=>setCart(p=>p.filter(i=>i.id!==id));
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);

  if(page==='admin'){
    if(!adminAuth) return <AdminLogin onLogin={()=>setAdminAuth(true)}/>;
    return <AdminPanel onExit={()=>setPage('home')}/>;
  }

  return <div style={{background:C.bg,minHeight:'100vh',color:C.text,fontFamily:F.B,fontWeight:300}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      input,textarea,button,select{font-family:inherit}
      input:focus,textarea:focus,select:focus{border-color:#c9a76c!important;outline:none}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d0d}::-webkit-scrollbar-thumb{background:#2a2a2a}
    `}</style>
    <Nav page={page} setPage={setPage} cartCount={cartCount}/>
    {page==='home'&&<HomePage setPage={setPage} products={products} addToCart={addToCart}/>}
    {page==='shop'&&<ShopPage products={products} addToCart={addToCart}/>}
    {page==='bulk'&&<BulkPage setPage={setPage}/>}
    {page==='custom'&&<CustomPage/>}
    {page==='cart'&&<CartPage cart={cart} updateQty={updateQty} remove={remove} setPage={setPage}/>}
  </div>;
}