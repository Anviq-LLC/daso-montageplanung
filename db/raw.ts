import { env } from 'cloudflare:workers';
export function db(): D1Database { if(!env.DB) throw new Error('Datenbank nicht verfügbar'); return env.DB; }
export function bucket(): R2Bucket { if(!env.BUCKET) throw new Error('Dateispeicher nicht verfügbar'); return env.BUCKET; }
// Bumped after every write so idle clients can skip the full reload. Table is created on first write.
export async function dataVersion():Promise<number|null>{try{return (await db().prepare('SELECT v FROM data_version WHERE id=1').first<{v:number}>())?.v??null}catch{return null}}
export async function bumpVersion(res:Response):Promise<Response>{
  if(res.ok){const d=db();try{await d.batch([d.prepare('CREATE TABLE IF NOT EXISTS data_version(id INTEGER PRIMARY KEY, v INTEGER NOT NULL)'),d.prepare('INSERT INTO data_version(id,v) VALUES(1,1) ON CONFLICT(id) DO UPDATE SET v=v+1')])}catch(e){console.error(e)}}
  return res;
}
export type AccessRole='planer'|'obermonteur'|'monteur';
export type CurrentUser={id:string;email:string;name:string;accessRole:AccessRole;resourceId:string|null};
export async function currentUser(r:Request):Promise<CurrentUser|null>{
  const email=r.headers.get('cf-access-authenticated-user-email')?.trim().toLowerCase();
  if(!email) return null;
  const row=await db().prepare('SELECT u.* FROM users u LEFT JOIN resources r ON r.id=u.resource_id WHERE u.email=? AND r.archived_at IS NULL').bind(email).first<any>();
  if(!row) return null;
  return {id:row.id,email:row.email,name:row.name,accessRole:row.access_role,resourceId:row.resource_id};
}
