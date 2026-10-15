type NavigationState = { expanded:readonly string[]; activeRoute:string|null };
const initialState:NavigationState={expanded:['root'],activeRoute:null};
let state=initialState;
let loaded=false;
const listeners=new Set<()=>void>();
const storageKey='career-folder-disclosures';

function update(next:NavigationState) {
 state=next;
 try { sessionStorage.setItem(storageKey,JSON.stringify(state.expanded)); } catch { /* Navigation works without storage. */ }
 listeners.forEach(listener=>listener());
}

export const careerNavigationState={
 subscribe(listener:()=>void) { listeners.add(listener);return ()=>{listeners.delete(listener);}; },
 snapshot:()=>state,
 serverSnapshot:()=>initialState,
 activate(route:string,branch:readonly string[],allowed:readonly string[]) {
  let expanded=state.expanded;
  if(!loaded) {
   loaded=true;
   try {
    const saved:unknown=JSON.parse(sessionStorage.getItem(storageKey)||'null');
    if(Array.isArray(saved))expanded=saved.filter((id):id is string=>typeof id==='string'&&allowed.includes(id));
   } catch { /* Keep the stable defaults when storage is unavailable. */ }
  }
  update({expanded:[...new Set([...expanded,...branch])],activeRoute:route});
 },
 toggle(id:string) {
  update({...state,expanded:state.expanded.includes(id)?state.expanded.filter(value=>value!==id):[...state.expanded,id]});
 },
};
