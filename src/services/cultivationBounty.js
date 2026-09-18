import crypto from 'node:crypto';
import { Mutex } from '../utils/mutex.js';
import { CULTIVATION_REALMS, CULTIVATION_STAGES, CULTIVATION_ITEMS } from '../config/cultivationGame.js';
import { addInventoryItem, getCultivationProfile, saveCultivationProfile } from './cultivationService.js';
import { getActivePet, getPetEffectValue } from './cultivationPet.js';
import { getSafeCavePetBonus, amplifySafePetEffect } from './cultivationCavePetBonus.js';
import { getFormationGameplayBonus, applyFormationStaminaReduction } from './cultivationFormationGameplay.js';
import { getAdventureRealmRewardMultipliers } from './cultivationRealmRewards.js';

const PREFIX = 'games:cultivation:bounty:';
const TZ = 'Asia/Ho_Chi_Minh';
export const BOUNTY_POINT_EMOJI = '<a:ttnhiemvu:1547682200961556510>';
export const BOUNTY_YAO_EMOJI = '<a:ttyeuthu:1547477368820469780>';

const MONSTERS = [
  { id:'huyet_nhan_ma_lang', name:'HUYẾT NHÃN MA LANG', weight:18 },
  { id:'u_minh_doc_mang', name:'U MINH ĐỘC MÃNG', weight:16 },
  { id:'thiet_giap_yeu_hung', name:'THIẾT GIÁP YÊU HÙNG', weight:15 },
  { id:'thanh_lan_yeu_xa', name:'THANH LÂN YÊU XÀ', weight:14 },
  { id:'xich_viem_yeu_vuong', name:'XÍCH DIỆM YÊU VƯƠNG', weight:8 },
  { id:'cuu_u_ma_vien', name:'CỬU U MA VIÊN', weight:7 },
  { id:'thon_thien_yeu_bang', name:'THÔN THIÊN YÊU BẰNG', weight:4 },
  { id:'hon_don_hung_thu', name:'HỖN ĐỘN HUNG THÚ', weight:1 },
];
const STAR_WEIGHTS=[{v:1,w:32},{v:2,w:31},{v:3,w:24},{v:4,w:11},{v:5,w:2}];
const key=(g,u)=>PREFIX+g+':'+u;
function dayKey(now=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
function hash(seed){return parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0,12),16);}
function rng(seed){let x=hash(seed)%2147483647;return()=>((x=x*48271%2147483647)-1)/2147483646;}
function weighted(list,roll,k='w'){let total=list.reduce((s,x)=>s+Number(x[k]||0),0),r=roll()*total;for(const x of list){r-=Number(x[k]||0);if(r<=0)return x;}return list[list.length-1];}
const progression=p=>Math.max(0,(Number(p.realmIndex)||0)*CULTIVATION_STAGES.length+(Number(p.stageIndex)||0));
function targetDisplay(step){const s=Math.max(0,Math.min(CULTIVATION_REALMS.length*CULTIVATION_STAGES.length-1,step));return CULTIVATION_REALMS[Math.floor(s/CULTIVATION_STAGES.length)]+' · '+CULTIVATION_STAGES[s%CULTIVATION_STAGES.length];}
function danger(c){if(c>=.82)return'Dễ dàng';if(c>=.66)return'Ngang sức';if(c>=.48)return'Hung hiểm';return'Cửu tử nhất sinh';}
function rewardFor(profile,stars){
  const realmRewards=getAdventureRealmRewardMultipliers(profile);
  const immortal=Number(profile.realmIndex)>=CULTIVATION_REALMS.indexOf('Chân Tiên');
  const baseCultivation=immortal?200000:Math.round((150+stars*70)*realmRewards.cultivation);
  const baseStones=immortal?Math.round((70+stars*35)*realmRewards.spiritStones):Math.round((70+stars*35)*realmRewards.spiritStones);
  const starMultiplier=[0.75,1,1.35,1.8,2.5][stars-1];
  return{cultivation:Math.max(300,Math.round(baseCultivation*starMultiplier)),stones:Math.max(180,Math.round(baseStones*starMultiplier)),points:[8,20,45,75,120][stars-1]};
}
function makeTargets(g,u,p,date){const roll=rng(g+':'+u+':'+date+':bounty-v1'),used=new Set();return[0,1,2].map((_,slot)=>{let stars=weighted(STAR_WEIGHTS,roll).v;if(slot===2&&stars<2)stars=2;const monster=weighted(MONSTERS.filter(m=>!used.has(m.id)),roll,'weight');used.add(monster.id);const maxStep=CULTIVATION_REALMS.length*CULTIVATION_STAGES.length-1;const step=Math.max(0,Math.min(maxStep,progression(p)+[-2,-1,0,1,2][stars-1]));return{slot,id:date+':'+slot+':'+monster.id,monsterId:monster.id,name:monster.name,stars,rare:stars>=4,step,realm:targetDisplay(step),staminaCost:7+stars*3,reward:rewardFor(p,stars),completed:false};});}
function normalize(raw,date,targets){
  if(!raw||raw.date!==date)return{version:1,date,points:Math.max(0,Number(raw?.points)||0),completed:{},targets};
  const completed=raw.completed&&typeof raw.completed==='object'?raw.completed:{};
  const storedTargets=Array.isArray(raw.targets)&&raw.targets.length===3?raw.targets:targets;
  return{...raw,version:1,date,points:Math.max(0,Number(raw.points)||0),completed,targets:storedTargets.map((t,slot)=>({...t,slot,completed:completed[t.id]===true}))};
}
async function getState(client,g,u,p){const date=dayKey(),raw=await client.db.get(key(g,u),null),s=normalize(raw,date,makeTargets(g,u,p,date));if(!raw||raw.date!==date)await client.db.set(key(g,u),s);return s;}
export function getBountyResetRemaining(now=Date.now()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)),v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return Math.max(0,Date.UTC(+v.year,+v.month-1,+v.day+1,-7)-now);}
async function combatInfo(client,g,u,p,t){const cave=await getSafeCavePetBonus(client,g,u),pet=amplifySafePetEffect(getPetEffectValue(p,'combat_success_bonus'),cave,{cap:.9}),diff=t.step-progression(p),base=Math.max(.22,Math.min(.9,.72-diff*.105)),chance=Math.max(.1,Math.min(.95,base+pet));return{chance,danger:danger(chance),petBonus:pet,activePet:getActivePet(p)};}
export async function getBountyBoard(client,g,u){const profile=await getCultivationProfile(client,g,u),s=await getState(client,g,u,profile),formation=await getFormationGameplayBonus(client,g,u),targets=[];for(const t of s.targets){const staminaResult=applyFormationStaminaReduction(t.staminaCost,formation.effects);targets.push({...t,actualStaminaCost:staminaResult.total,staminaSaved:staminaResult.saved,...await combatInfo(client,g,u,profile,t)});}return{ok:true,date:s.date,profile,points:s.points,targets,resetRemaining:getBountyResetRemaining()};}
export async function getBountyTarget(client,g,u,slot,expectedDate=null){const board=await getBountyBoard(client,g,u);if(expectedDate&&expectedDate!==dayKey())return{ok:false,reason:'expired_board',...board};const target=board.targets[Number(slot)];return target?{...board,target}:{ok:false,reason:'invalid_target',...board};}
export async function fightBounty(client,g,u,slot,expectedDate=null){return Mutex.runExclusive('cultivation:'+g+':'+u,async()=>{const profile=await getCultivationProfile(client,g,u),s=await getState(client,g,u,profile);if(expectedDate&&expectedDate!==s.date)return{ok:false,reason:'expired_board',profile,points:s.points};const target=s.targets[Number(slot)];if(!target)return{ok:false,reason:'invalid_target',profile};if(s.completed[target.id])return{ok:false,reason:'completed',profile,target:{...target,completed:true},points:s.points};const formation=await getFormationGameplayBonus(client,g,u);const staminaResult=applyFormationStaminaReduction(target.staminaCost,formation.effects);const actualStaminaCost=staminaResult.total;if((Number(profile.stamina)||0)<actualStaminaCost)return{ok:false,reason:'stamina',profile,target:{...target,actualStaminaCost},points:s.points};const info=await combatInfo(client,g,u,profile,target);profile.stamina=Math.max(0,(Number(profile.stamina)||0)-actualStaminaCost);const success=Math.random()<info.chance;let drop=null,reward={cultivation:0,stones:0,points:0};if(success){reward={...target.reward};const cave=await getSafeCavePetBonus(client,g,u),rewardPet=amplifySafePetEffect(getPetEffectValue(profile,'combat_reward_bonus'),cave);reward.cultivation=Math.round(reward.cultivation*(1+rewardPet+Math.max(0,Number(formation.effects?.adventureBonus)||0)));reward.stones=Math.round(reward.stones*(1+rewardPet+Math.max(0,Number(formation.effects?.spiritStoneBonus)||0)));profile.cultivation=Math.max(0,Number(profile.cultivation)||0)+reward.cultivation;profile.totalCultivation=Math.max(0,Number(profile.totalCultivation)||0)+reward.cultivation;profile.spiritStones=Math.max(0,Number(profile.spiritStones)||0)+reward.stones;s.points+=reward.points;s.completed[target.id]=true;const dc=[.04,.08,.14,.24,.38][target.stars-1];if(Math.random()<dc){const rareRoll=Math.random();const itemId=target.stars===5?(rareRoll<.18?'vo_danh_kiem_pho':rareRoll<.48?'co_phu':'huyen_thiet'):target.stars===4?(rareRoll<.18?'co_phu':'huyen_thiet'):(Math.random()<.55?'huyen_thiet':'thien_linh_thao');if(CULTIVATION_ITEMS[itemId]&&addInventoryItem(profile,itemId,1))drop={itemId,item:CULTIVATION_ITEMS[itemId],quantity:1};}}const saved=await saveCultivationProfile(client,profile);await client.db.set(key(g,u),s);return{ok:true,success,profile:saved,target:{...target,completed:success,actualStaminaCost},points:s.points,reward,drop,staminaSaved:staminaResult.saved,...info};});}
