import Conditions from '../../../../../resources/conditions';
import Outputs from '../../../../../resources/outputs';
import { callOverlayHandler } from '../../../../../resources/overlay_plugin_api';
import { Responses } from '../../../../../resources/responses';
import Util, { Directions } from '../../../../../resources/util';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { PluginCombatantState } from '../../../../../types/event';
import { Job } from '../../../../../types/job';
import { NetMatches } from '../../../../../types/net_matches';
import { PartyMemberParamObject } from '../../../../../types/party';
import { LocaleText, Output, ResponseOutput, TriggerSet } from '../../../../../types/trigger';

type RousingTower = {
  blue?: string;
  orange?: string;
};

const headmarkers = {
  // vfx/lockon/eff/sph_lockon2_num01_s8p.avfx (through sph_lockon2_num04_s8p)
  limitCut1: '0150',
  limitCut2: '0151',
  limitCut3: '0152',
  limitCut4: '0153',
} as const;

const mokoVfxMap = {
  '24C': 'backRed',
  '24D': 'leftRed',
  '24E': 'frontRed',
  '24F': 'rightRed',
  '250': 'backBlue',
  '251': 'leftBlue',
  '252': 'frontBlue',
  '253': 'rightBlue',
} as const;
type KasumiGiri = typeof mokoVfxMap[keyof typeof mokoVfxMap];
const looseMokoVfxMap: { [id: string]: KasumiGiri } = mokoVfxMap;

const shadowVfxMap = {
  '248': 'back',
  '249': 'left',
  '24A': 'front',
  '24B': 'right',
} as const;
type ShadowKasumiGiri = typeof shadowVfxMap[keyof typeof shadowVfxMap];
const looseShadowVfxMap: { [id: string]: ShadowKasumiGiri } = shadowVfxMap;

const limitCutIds: readonly string[] = Object.values(headmarkers);

const mokoCenterX = -200;
const mokoCenterY = 0;

const tripleKasumiFirstOutputStrings = {
  backRedFirst: {
    en: 'Back + Out',
    de: 'Hinten + Raus',
    fr: 'Arrière + Extérieur',
    ja: '後ろ + 外',
    cn: '后 + 远离',
    ko: '뒤 + 밖',
  },
  leftRedFirst: {
    en: 'Left + Out',
    de: 'Links + Raus',
    fr: 'Gauche + Extérieur',
    ja: '左 + 外',
    cn: '左 + 远离',
    ko: '왼쪽 + 밖',
  },
  frontRedFirst: {
    en: 'Front + Out',
    de: 'Vorne + Raus',
    fr: 'Devant + Extérieur',
    ja: '前 + 外',
    cn: '前 + 远离',
    ko: '앞 + 밖',
  },
  rightRedFirst: {
    en: 'Right + Out',
    de: 'Rechts + Raus',
    fr: 'Droite + Extérieur',
    ja: '右 + 外',
    cn: '右 + 远离',
    ko: '오른쪽 + 밖',
  },
  backBlueFirst: {
    en: 'Back + In',
    de: 'Hinten + Rein',
    fr: 'Arrière + Intérieur',
    ja: '後ろ + 中',
    cn: '后 + 靠近',
    ko: '뒤 + 안',
  },
  leftBlueFirst: {
    en: 'Left + In',
    de: 'Links + Rein',
    fr: 'Gauche + Intérieur',
    ja: '左 + 中',
    cn: '左 + 靠近',
    ko: '왼쪽 + 안',
  },
  frontBlueFirst: {
    en: 'Front + In',
    de: 'Vorne + Rein',
    fr: 'Devant + Intérieur',
    ja: '前 + 中',
    cn: '前 + 靠近',
    ko: '앞 + 안',
  },
  rightBlueFirst: {
    en: 'Right + In',
    de: 'Rechts + Rein',
    fr: 'Droite + Intérieur',
    ja: '右 + 中',
    cn: '右 + 靠近',
    ko: '오른쪽 + 안',
  },
} as const;

// It might be more accurate to say "rotate right" here than "right" (implying right flank)
// but that's very long. This is one of those "you need to know the mechanic" situations.
const tripleKasumiFollowupOutputStrings = {
  backRed: {
    en: 'Stay + Out',
    de: 'bleib Stehen + Raus',
    fr: 'Restez + Extérieur',
    ja: 'そのまま + 外',
    cn: '停 + 远离',
    ko: '그대로 + 밖',
  },
  leftRed: {
    en: 'Left + Out',
    de: 'Links + Raus',
    fr: 'Gauche + Extérieur',
    ja: '左 + 外',
    cn: '左左左 + 远离',
    ko: '왼쪽 + 밖',
  },
  frontRed: {
    en: 'Through + Out',
    de: 'Durch + Raus',
    fr: 'À travers + Extérieur',
    ja: 'またいで + 外',
    cn: '穿 + 远离',
    ko: '가로지르기 + 밖',
  },
  rightRed: {
    en: 'Right + Out',
    de: 'Rechts + Raus',
    fr: 'Droite + Extérieur',
    ja: '右 + 外',
    cn: '右右右 + 远离',
    ko: '오른쪽 + 밖',
  },
  backBlue: {
    en: 'Stay + In',
    de: 'bleib Stehen + Rein',
    fr: 'Restez + Intérieur',
    ja: 'そのまま + 中',
    cn: '停 + 靠近',
    ko: '그대로 + 안',
  },
  leftBlue: {
    en: 'Left + In',
    de: 'Links + Rein',
    fr: 'Gauche + Intérieur',
    ja: '左 + 中',
    cn: '左左左 + 靠近',
    ko: '왼쪽 + 밖',
  },
  frontBlue: {
    en: 'Through + In',
    de: 'Durch + Rein',
    fr: 'À travers + Intérieur',
    ja: 'またいで + 中',
    cn: '穿 + 靠近',
    ko: '가로지르기 + 안',
  },
  rightBlue: {
    en: 'Right + In',
    de: 'Rechts + Rein',
    fr: 'Droite + Intérieur',
    ja: '右 + 中',
    cn: '右右右 + 靠近',
    ko: '오른쪽 + 안',
  },
};

type StackPartners = 'melee' | 'role' | 'partner' | 'unknown';
type StackSpreadMechanic = StackPartners | 'spread';
const basicStackSpreadOutputStrings: Record<StackSpreadMechanic, LocaleText> = {
  spread: Outputs.spread,
  melee: {
    en: 'Melees Stack',
    de: 'Nahkämpfer sammeln',
    fr: 'Package mêlées',
    ja: '近接ペア',
    cn: '近战分摊',
    ko: '근딜 쉐어',
  },
  role: {
    en: 'Role Stacks',
    de: 'Rollengruppe sammeln',
    fr: 'Package par role',
    ja: 'ロールペア',
    cn: '职能分摊',
    ko: '역할별 쉐어',
  },
  partner: {
    en: 'Partner Stacks',
    de: 'Partner sammeln',
    fr: 'Package partenaire',
    ja: 'ペア',
    cn: '和搭档分摊',
    ko: '파트너 쉐어',
  },
  unknown: {
    en: 'Stacks',
    de: 'Sammeln',
    fr: 'Package',
    ja: '頭割り',
    cn: '分摊',
    ko: '쉐어',
  },
} as const;

const tripleKasumiAbilityIds = [
  '85B0', // back red first
  '85B1', // left red first
  '85B2', // front red first
  '85B3', // right red first
  '85B4', // back red followup
  '85B5', // left red followup
  '85B6', // front red followup
  '85B7', // right red followup
  '85BA', // back blue first
  '85BB', // left blue first
  '85BC', // front blue first
  '85BD', // right blue first
  '85BE', // back blue followup
  '85BF', // left blue followup
  '85C0', // front blue followup
  '85C1', // right blue followup
] as const;

export interface Data extends RaidbossData {
  readonly triggerSetConfig: {
    stackOrder: 'meleeRolesPartners' | 'rolesPartners';
  };
  stackSpreadFirstMechanic?: StackSpreadMechanic;
  stackSpreadSecondMechanic?: StackSpreadMechanic;
  combatantData: PluginCombatantState[];
  seenShishuYukiAuto?: boolean;
  smokeaterCount: number;
  rairinCollect: NetMatches['AddedCombatant'][];
  wailingCollect: NetMatches['GainsEffect'][];
  wailCount: number;
  devilishThrallCollect: NetMatches['StartsUsing'][];
  vortexSecondMechanic?: 'in' | 'out';
  reishoCount: number;
  ghostHeadmarkers: NetMatches['HeadMarker'][];
  ghostMechanic?: 'spread' | 'tower';
  sparksCollect: NetMatches['GainsEffect'][];
  sparksCount: number;
  rousingCollect: [RousingTower, RousingTower, RousingTower, RousingTower];
  rousingTowerCount: number;
  malformedCollect: NetMatches['GainsEffect'][];
  myMalformedEffects: string[];
  tripleKasumiCollect: KasumiGiri[];
  explosionLineCollect: NetMatches['MapEffect'][];
  shadowKasumiCollect: { [shadowId: string]: ShadowKasumiGiri[] };
  shadowKasumiTether: { [shadowId: string]: string };
  oniClaw?: 'northSouth' | 'eastWest';
  invocationCollect: NetMatches['GainsEffect'][];
  iaigiriTether: NetMatches['Tether'][];
  iaigiriPurple: NetMatches['GainsEffect'][];
  iaigiriCasts: NetMatches['StartsUsing'][];
  myAccursedEdge?: NetMatches['Ability'];
  myIaigiriTether?: NetMatches['Tether'];
  seenSoldiersOfDeath?: boolean;
}

const countJob = (job1: Job, job2: Job, func: (x: Job) => boolean): number => {
  return (func(job1) ? 1 : 0) + (func(job2) ? 1 : 0);
};

// For a given criteria func, if there's exactly one person who matches in the stack group
// and exactly one person who matches in the unmarked group, then they can stack together.
// This also filters out weird party comps naturally.
const couldStackLooseFunc = (
  stackJob1: Job,
  stackJob2: Job,
  unmarkedJob1: Job,
  unmarkedJob2: Job,
  func: (x: Job) => boolean,
): boolean => {
  const stackCount = countJob(stackJob1, stackJob2, func);
  const unmarkedCount = countJob(unmarkedJob1, unmarkedJob2, func);
  return stackCount === 1 && unmarkedCount === 1;
};
const isMeleeOrTank = (x: Job) => Util.isMeleeDpsJob(x) || Util.isTankJob(x);
const isSupport = (x: Job) => Util.isHealerJob(x) || Util.isTankJob(x);

const findStackPartners = (
  data: Data,
  stack1?: string,
  stack2?: string,
  stackOrderOverride?: typeof data.triggerSetConfig.stackOrder,
): StackPartners => {
  const party = data.party;
  if (stack1 === undefined || stack2 === undefined)
    return 'unknown';

  const stacks = [stack1, stack2];
  const unmarked = party.partyNames.filter((x) => !stacks.includes(x));
  if (unmarked.length !== 2 || party.partyNames.length !== 4)
    return 'unknown';

  const [stackJob1, stackJob2] = stacks.map((x) => party.jobName(x));
  if (stackJob1 === undefined || stackJob2 === undefined)
    return 'unknown';
  const [unmarkedJob1, unmarkedJob2] = unmarked.map((x) => party.jobName(x));
  if (unmarkedJob1 === undefined || unmarkedJob2 === undefined)
    return 'unknown';

  const couldStack = (func: (x: Job) => boolean): boolean => {
    return couldStackLooseFunc(stackJob1, stackJob2, unmarkedJob1, unmarkedJob2, func);
  };

  const stackOrder = stackOrderOverride ?? data.triggerSetConfig.stackOrder;
  if (stackOrder === 'meleeRolesPartners' && couldStack(isMeleeOrTank))
    return 'melee';
  if (couldStack(isSupport))
    return 'role';

  // if we get here, then you have a not normal light party comp, e.g. two ranged
  // or you have set the config option to be "rolesPartners" to not prefer melee.
  // For a tank/healer/ranged/ranged comp, this condition below will always be true
  // but make it anyway in case the party comp is something else entirely.
  const stackCount = countJob(stackJob1, stackJob2, isSupport);
  const unmarkedCount = countJob(unmarkedJob1, unmarkedJob2, isSupport);
  if (stackCount === 2 && unmarkedCount === 0 || stackCount === 0 && unmarkedCount === 2)
    return 'partner';

  // if something has gone incredibly awry, then just return the default
  return 'unknown';
};

const stackSpreadResponse = (
  data: Data,
  output: Output,
  collect: NetMatches['GainsEffect'][],
  stackId: string,
  spreadId: string,
  hideStackList?: boolean,
): ResponseOutput<Data, NetMatches['GainsEffect']> => {
  // cactbot-builtin-response
  output.responseOutputStrings = {
    // In a 4 person party with two randomly assigned stacks,
    // there are a couple of different "kinds of pairs" that make sense to call.
    //
    // You can have two melees together and two ranged together,
    // or you can have two supports together and two dps together (role stacks)
    // or you have no melee in your comp, and you could have mixed support and range.
    // Arguably things like "tank+ranged, melee+healer" are possible but are harder to call.
    //
    // Prefer "melee/ranged" stacks here and elsewhere because it keeps
    // the tank and melee together for uptime.
    spreadThenMeleeStack: {
      en: 'Spread => Melees Stack',
      de: 'Verteilen => Nahkämpfer sammeln',
      fr: 'Écartez-vous => Package mêlées',
      ja: '散会 => 近接ペア',
      cn: '分散 => 近战分摊',
      ko: '산개 => 근딜 쉐어',
    },
    spreadThenRoleStack: {
      en: 'Spread => Role Stacks',
      de: 'Verteilen => Rollengruppe sammeln',
      fr: 'Écartez-vous => Package par rôle',
      ja: '散会 => ロールペア',
      cn: '分散 => 职能分摊',
      ko: '산개 => 역할별 쉐어',
    },
    spreadThenPartnerStack: {
      en: 'Spread => Partner Stacks',
      de: 'Verteilen => Partner sammeln',
      fr: 'Écartez-vous => Package partenaire',
      ja: '散会 => ペア',
      cn: '分散 => 和搭档分摊',
      ko: '산개 => 파트너 쉐어',
    },
    meleeStackThenSpread: {
      en: 'Melees Stack => Spread',
      de: 'Nahkämpfer sammeln => Verteilen',
      fr: 'Package mêlées => Écartez-vous',
      ja: '近接ペア => 散会',
      cn: '近战分摊 => 分散',
      ko: '근딜 쉐어 => 산개',
    },
    roleStackThenSpread: {
      en: 'Role Stacks => Spread',
      de: 'Rollengruppe sammeln => Verteilen',
      fr: 'Package par rôle => Écartez-vous',
      ja: 'ロールペア => 散会',
      cn: '职能分摊 => 分散',
      ko: '역할별 쉐어 => 산개',
    },
    partnerStackThenSpread: {
      en: 'Partner Stacks => Spread',
      de: 'Partner sammeln => Verteilen',
      fr: 'Package partenaire => Écartez-vous',
      ja: 'ペア => 散会',
      cn: '和搭档分摊 => 分散',
      ko: '파트너 쉐어 => 산개',
    },
    spreadThenStack: Outputs.spreadThenStack,
    stackThenSpread: Outputs.stackThenSpread,
    stacks: {
      en: 'Stacks: ${player1}, ${player2}',
      de: 'Sammeln: ${player1}, ${player2}',
      fr: 'Package : ${player1}, ${player2}',
      ja: '頭割り: ${player1}, ${player2}',
      cn: '分摊点: ${player1}, ${player2}',
      ko: '쉐어: ${player1}, ${player2}',
    },
  };

  const [stack1, stack2] = collect.filter((x) => x.effectId === stackId);
  const spread = collect.find((x) => x.effectId === spreadId);
  if (stack1 === undefined || stack2 === undefined || spread === undefined)
    return;
  const stackTime = parseFloat(stack1.duration);
  const spreadTime = parseFloat(spread.duration);
  const isStackFirst = stackTime < spreadTime;

  const stackType = findStackPartners(data, stack1.target, stack2.target);

  const stacks = [stack1, stack2].map((x) => x.target).sort();
  const [player1, player2] = stacks.map((x) => data.party.member(x));
  const stackInfo = hideStackList
    ? {}
    : { infoText: output.stacks!({ player1: player1, player2: player2 }) };

  data.stackSpreadFirstMechanic = isStackFirst ? stackType : 'spread';
  data.stackSpreadSecondMechanic = isStackFirst ? 'spread' : stackType;

  if (stackType === 'melee') {
    if (isStackFirst)
      return { alertText: output.meleeStackThenSpread!(), ...stackInfo };
    return { alertText: output.spreadThenMeleeStack!(), ...stackInfo };
  } else if (stackType === 'role') {
    if (isStackFirst)
      return { alertText: output.roleStackThenSpread!(), ...stackInfo };
    return { alertText: output.spreadThenRoleStack!(), ...stackInfo };
  } else if (stackType === 'partner') {
    if (isStackFirst)
      return { alertText: output.partnerStackThenSpread!(), ...stackInfo };
    return { alertText: output.spreadThenPartnerStack!(), ...stackInfo };
  }

  // 'unknown' catch-all
  if (isStackFirst)
    return { alertText: output.stackThenSpread!(), ...stackInfo };
  return { alertText: output.spreadThenStack!(), ...stackInfo };
};

const towerResponse = (
  data: Data,
  output: Output,
): ResponseOutput<Data, NetMatches['None']> => {
  // cactbot-builtin-response
  output.responseOutputStrings = {
    tetherThenBlueTower: {
      en: 'Tether ${num1} => Blue Tower ${num2}',
      de: 'Verbindung ${num1} => Blauer Turm ${num2}',
      fr: 'Lien ${num1} => Tour bleue ${num2}',
      ja: '線${num1} => 青塔${num2}',
      cn: '连线 ${num1} => 蓝塔 ${num2}',
      ko: '선 ${num1} => 파랑 기둥 ${num2}',
    },
    tetherThenOrangeTower: {
      en: 'Tether ${num1} => Orange Tower ${num2}',
      de: 'Verbindung ${num1} => Orangener Turm ${num2}',
      fr: 'Lien ${num1} => Tour orange ${num2}',
      ja: '線${num1} => 赤塔${num2}',
      cn: '连线 ${num1} => 橙塔 ${num2}',
      ko: '선 ${num1} => 주황 기둥 ${num2}',
    },
    tether: {
      en: 'Tether ${num}',
      de: 'Verbindung ${num}',
      fr: 'Lien ${num}',
      ja: '線${num}',
      cn: '连线 ${num}',
      ko: '선 ${num}',
    },
    blueTower: {
      en: 'Blue Tower ${num}',
      de: 'Blauer Turm ${num}',
      fr: 'Tour bleue ${num}',
      ja: '青塔${num}',
      cn: '蓝塔 ${num}',
      ko: '파랑 기둥 ${num}',
    },
    orangeTower: {
      en: 'Orange Tower ${num}',
      de: 'Orangener Turm ${num}',
      fr: 'Tour orange ${num}',
      ja: '赤塔${num}',
      cn: '橙塔 ${num}',
      ko: '주황 기둥 ${num}',
    },
    num1: Outputs.num1,
    num2: Outputs.num2,
    num3: Outputs.num3,
    num4: Outputs.num4,
  };

  // data.rousingTowerCount is 0-indexed
  // towerNum for display is 1-indexed
  const theseTowers = data.rousingCollect[data.rousingTowerCount];
  const towerNum = data.rousingTowerCount + 1;
  data.rousingTowerCount++;

  if (theseTowers === undefined)
    return;

  const numMap: { [towerNum: number]: string } = {
    1: output.num1!(),
    2: output.num2!(),
    3: output.num3!(),
    4: output.num4!(),
  } as const;

  const numStr = numMap[towerNum];
  if (numStr === undefined)
    return;

  if (data.me === theseTowers.blue)
    return { alertText: output.blueTower!({ num: numStr }) };
  if (data.me === theseTowers.orange)
    return { alertText: output.orangeTower!({ num: numStr }) };
  const nextTowers = data.rousingCollect[towerNum + 1];
  const nextNumStr = numMap[towerNum + 1];
  if (towerNum === 4 || nextTowers === undefined || nextNumStr === undefined)
    return { infoText: output.tether!({ num: numStr }) };

  if (data.me === nextTowers.blue)
    return { infoText: output.tetherThenBlueTower!({ num1: numStr, num2: nextNumStr }) };
  if (data.me === nextTowers.orange)
    return { infoText: output.tetherThenOrangeTower!({ num1: numStr, num2: nextNumStr }) };

  // Just in case...
  return { infoText: output.tether!({ num: numStr }) };
};

const triggerSet: TriggerSet<Data> = {
  id: 'AnotherMountRokkon',
  zoneId: ZoneId.AnotherMountRokkon,
  config: [
    {
      id: 'stackOrder',
      comment: {
        en:
          `For any two person stacks, this specifies the priority order for picking people to stack together.
           If you want your melee and tank to stick together if possible, pick the option with melees in it.
           Melees stack means melee+tank and healer+ranged. Role stacks means tank+healer and dps+dps.
           Partner stacks mean support+dps and support+dps (any combination works).
           If you have two ranged dps or two melee dps, it will never call "melees" regardless of this config option.
           There is no support for party comps that are not two support and two dps.`,
        de:
          `Für jeden Zwei-Personen-Stack gibt dies die Prioritätsreihenfolge für die Auswahl der Personen an, die sich sammeln.
           Wenn ihr wollt, dass Nahkämpfer und Tank nach Möglichkeit zusammenbleiben, wählt die Option mit den Nahkämpfern aus.
           Nahkampf-Stack bedeutet Nahkampf+Tank und Heiler+Ranger. Rollen-Stack bedeutet Tank+Heiler und Dps+Dps.
           Partner-Stack bedeuten Supporter+Dps und Supporter+Dps (jede Kombination ist möglich).
           Wenn du zwei Fernkampf-DPS oder zwei Nahkampf-DPS hast, wird es nie "Nahkämpfer" nennen, unabhängig von dieser Konfigurationsoption.
           Es gibt keine Unterstützung für Gruppenkombinationen, die nicht aus zwei Supportern und zwei DPS bestehen.`,
        fr:
          `Pour n'importe quel package à deux, ceci spécifie l'ordre de priorité pour choisir la personne avec qui se packer.
          Si vous voulez votre mêlée et tank ensemble, choisissez l'option contenant mêlée.
          Package mêlée signifie mêlée+tank et healer+distant. Package par rôle signifie tank+healer et dps+dps.
          Package partenaire signifie support+dps (n'importe quelle combinaison fonctionne).
          Si votre groupe est composée de deux distants ou deux mêlées, "mêlées" ne sera jamais annoncé quelque soit l'option choisie.
          Les groupes ne contenant pas deux supports et deux dps ne peuvent pas être annoncés.`,
        ja: `2人ペアで一緒にペアを作り優先順位を決めます。近接とタンクを組む場合は近接オプションを選んでください。
          近接ペアは近接+タンクとヒーラ+遠隔を意味します。ロールはタンク+ヒーラ、近接+遠隔を意味します。
          遠隔まだは近接が2人の場合は、ここの設定を無視して近接呼び出しはありません。
          および、タンク+ヒーラ+DPS2人じゃないパティは志願しません。`,
        cn: `对于所有双人分摊，该选项指定了选择谁与谁分摊的优先级。
           如果你想让近战优先和坦克分摊, 选择含有“近战”的选项。
           近战分摊指的是 近战+坦克 和 治疗+远程。职能分摊指的是 坦克 + 治疗 和 DPS + DPS。
           搭档分摊指的是 坦克 + DPS 和 治疗 + DPS (任意组合均可)。
           如果队伍中有两名远程 DPS 或近战 DPS, 无论此配置选项如何, 它都不会报“近战分摊”。
           没有考虑对非标准阵容队伍 (非1T1N2DPS) 构成的支持。`,
        ko: `2인 쉐어에서, 함께 쉐어를 맞을 사람의 우선 순위를 지정합니다. 근딜과 탱커를 함께 배치하고 싶다면 근딜이 포함된 옵션을 선택하세요.
           근딜 쉐어는 근딜+탱커와 힐러+원딜을 의미합니다. 역할별 쉐어는 탱커+힐러와 딜러+딜러를 의미합니다.
           파트너 쉐어는 탱힐+딜러와 탱힐+딜러를 의미합니다(어떤 조합도 가능).
           원딜이 두 명 또는 근딜이 두 명일 경우, 이 설정 옵션과 상관없이 "근딜"을 호출하지 않습니다.
           탱힐 둘, 딜러 둘이 아닌 파티 구성은 지원되지 않습니다.`,
      },
      name: {
        en: 'Stack Selection Order',
        de: 'Sammel-Reihenfolge',
        fr: 'Ordre de sélection des packages',
        ja: 'ペア優先順位',
        cn: '选择分摊次序',
        ko: '쉐어 우선순위',
      },
      type: 'select',
      options: {
        en: {
          'Melees > Roles > Partners': 'meleeRolesPartners',
          'Roles > Partners': 'rolesPartners',
        },
        de: {
          'Nahkämpfer > Rollen > Partner': 'meleeRolesPartners',
          'Rollen > Partner': 'rolesPartners',
        },
        fr: {
          'Mêlées > Rôles > Partenaires': 'meleeRolesPartners',
          'Rôles > Partenaires': 'rolesPartners',
        },
        ja: {
          '近接 > ロール > ペア': 'meleeRolesPartners',
          'ロール > ペア': 'rolesPartners',
        },
        cn: {
          '近战 > 职能 > 搭档': 'meleeRolesPartners',
          '职能 > 搭档': 'rolesPartners',
        },
        ko: {
          '근딜 > 역할군 > 파트너': 'meleeRolesPartners',
          '역할군 > 파트너': 'rolesPartners',
        },
      },
      default: 'meleeRolesPartners',
    },
  ],
  timelineFile: 'another_mount_rokkon.txt',
  initData: () => {
    return {
      combatantData: [],
      smokeaterCount: 0,
      rairinCollect: [],
      wailingCollect: [],
      wailCount: 0,
      devilishThrallCollect: [],
      reishoCount: 0,
      ghostHeadmarkers: [],
      sparksCollect: [],
      sparksCount: 0,
      rousingCollect: [{}, {}, {}, {}],
      rousingTowerCount: 0,
      malformedCollect: [],
      myMalformedEffects: [],
      malformedTowerCount: 0,
      tripleKasumiCollect: [],
      explosionLineCollect: [],
      shadowKasumiCollect: {},
      shadowKasumiTether: {},
      invocationCollect: [],
      iaigiriTether: [],
      iaigiriPurple: [],
      iaigiriCasts: [],
      oniClawCollect: [],
    };
  },
  triggers: [
    // ---------------- first trash ----------------
    {
      id: 'AMR Shishu Raiko Disciples of Levin',
      type: 'StartsUsing',
      netRegex: { id: '8656', source: 'Shishu Raiko', capture: false },
      response: Responses.getOut(),
    },
    {
      id: 'AMR Shishu Raiko Barreling Smash',
      type: 'StartsUsing',
      netRegex: { id: '8653', source: 'Shishu Raiko' },
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          chargeOnYou: {
            en: 'Charge on YOU',
            de: 'Ansturm auf DIR',
            fr: 'Ruée sur VOUS',
            ja: '自分に突進',
            cn: '冲锋点名',
            ko: '돌진 대상자',
          },
          chargeOn: {
            en: 'Charge on ${player}',
            de: 'Ansturm auf ${player}',
            fr: 'Ruée sur ${player}',
            ja: '突進: ${player}',
            cn: '冲锋点 ${player}',
            ko: '돌진 ${player}',
          },
        };

        if (matches.target === data.me)
          return { alarmText: output.chargeOnYou!() };
        return { alertText: output.chargeOn!({ player: data.party.member(matches.target) }) };
      },
    },
    {
      id: 'AMR Shishu Raiko Howl',
      type: 'StartsUsing',
      netRegex: { id: '8654', source: 'Shishu Raiko', capture: false },
      response: Responses.aoe(),
    },
    {
      id: 'AMR Shishu Raiko Master of Levin',
      type: 'StartsUsing',
      netRegex: { id: '8655', source: 'Shishu Raiko', capture: false },
      response: Responses.getUnder(),
    },
    {
      id: 'AMR Shishu Fuko Scythe Tail',
      type: 'StartsUsing',
      netRegex: { id: '865A', source: 'Shishu Fuko', capture: false },
      response: Responses.getOut(),
    },
    {
      id: 'AMR Shishu Fuko Twister',
      type: 'StartsUsing',
      netRegex: { id: '8658', source: 'Shishu Fuko' },
      response: Responses.stackMarkerOn(),
    },
    {
      id: 'AMR Shishu Fuko Crosswind',
      type: 'StartsUsing',
      netRegex: { id: '8659', source: 'Shishu Fuko', capture: false },
      response: Responses.knockback(),
    },
    {
      id: 'AMR Shishu Yuki Auto Tracker',
      type: 'Ability',
      netRegex: { id: '7A58', source: 'Shishu Yuki', capture: false },
      // Before being pulled (aka seeing an auto), Shishu Yuki faces south when doing
      // right/left cleaves. Make these absolute directions for clarity.
      // Shishu Yuki does have a buff that prevents pulling it, but there's no line
      // for this buff loss.
      run: (data) => data.seenShishuYukiAuto = true,
    },
    {
      id: 'AMR Shishu Yuki Right Swipe',
      type: 'StartsUsing',
      netRegex: { id: '8685', source: 'Shishu Yuki', capture: false },
      alertText: (data, _matches, output) => {
        return data.seenShishuYukiAuto ? output.left!() : output.east!();
      },
      outputStrings: {
        east: Outputs.east,
        left: Outputs.left,
      },
    },
    {
      id: 'AMR Shishu Yuki Left Swipe',
      type: 'StartsUsing',
      netRegex: { id: '8686', source: 'Shishu Yuki', capture: false },
      alertText: (data, _matches, output) => {
        return data.seenShishuYukiAuto ? output.right!() : output.west!();
      },
      outputStrings: {
        west: Outputs.west,
        right: Outputs.right,
      },
    },
    // ---------------- Shishio ----------------
    {
      id: 'AMR Shishio Enkyo',
      type: 'StartsUsing',
      netRegex: { id: '841A', source: 'Shishio', capture: false },
      response: Responses.aoe(),
    },
    {
      id: 'AMR Shishio Smokeater Count',
      type: 'Ability',
      // 83F9 is the initial Smokeater, and 83FA is the followup optional two.
      netRegex: { id: ['83F9', '83FA'], source: 'Shishio' },
      sound: '',
      infoText: (data, matches, output) => {
        if (matches.id === '83F9') {
          data.smokeaterCount = 1;
          return output.num1!();
        }
        data.smokeaterCount++;
        if (data.smokeaterCount === 2)
          return output.num2!();
        return output.num3!();
      },
      outputStrings: {
        num1: Outputs.num1,
        num2: Outputs.num2,
        num3: Outputs.num3,
      },
    },
    {
      id: 'AMR Shishio Splitting Cry',
      type: 'StartsUsing',
      netRegex: { id: '841B', source: 'Shishio' },
      response: Responses.tankBuster(),
    },
    {
      id: 'AMR Shishio Splitter',
      type: 'Ability',
      // This comes out ~4s after Splitting Cry.
      netRegex: { id: '841B', source: 'Shishio', capture: false },
      suppressSeconds: 5,
      response: Responses.goFrontOrSides('info'),
    },
    {
      id: 'AMR Rairin Collect',
      type: 'AddedCombatant',
      netRegex: { npcNameId: '12430' },
      run: (data, matches) => data.rairinCollect.push(matches),
    },
    {
      id: 'AMR Noble Pursuit',
      type: 'AddedCombatant',
      netRegex: { npcNameId: '12430', capture: false },
      condition: (data) => data.rairinCollect.length === 4,
      alertText: (data, _matches, output) => {
        const [one, two, three, four] = data.rairinCollect;
        if (one === undefined || two === undefined || three === undefined || four === undefined)
          return;

        // one is always north (0, -115)
        // two is always south (0, -85)
        // three is left or right (+/-15, -80)
        // four is either diagonal (7.5, -92.5) / (-6, -94) or back north (+/-20, -95)

        // We always end up on the opposite side as the third charge.
        const isThreeEast = parseFloat(three.x) > 0;
        // If four is diagonal, you go south otherwise north.
        const isFourDiagonal = Math.abs(parseFloat(four.x)) < 18;

        if (isFourDiagonal)
          return isThreeEast ? output.southwest!() : output.southeast!();
        return isThreeEast ? output.northwest!() : output.northeast!();
      },
      outputStrings: {
        northeast: Outputs.northeast,
        southeast: Outputs.southeast,
        southwest: Outputs.southwest,
        northwest: Outputs.northwest,
      },
    },
    {
      id: 'AMR Shishio Unnatural Wail Count',
      type: 'StartsUsing',
      netRegex: { id: '8417', source: 'Shishio', capture: false },
      run: (data) => {
        data.wailCount++;
        data.wailingCollect = [];
      },
    },
    {
      id: 'AMR Shishio Wailing Collect',
      type: 'GainsEffect',
      // DEB = Scattered Wailing (spread)
      // DEC = Intensified Wailing (stack)
      netRegex: { effectId: ['DEB', 'DEC'], source: 'Shishio' },
      run: (data, matches) => data.wailingCollect.push(matches),
    },
    {
      id: 'AMR Shishio Unnatural Wailing 1',
      type: 'GainsEffect',
      netRegex: { effectId: ['DEB', 'DEC'], source: 'Shishio', capture: false },
      condition: (data) => data.wailCount === 1,
      delaySeconds: 0.5,
      suppressSeconds: 999999,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        return stackSpreadResponse(data, output, data.wailingCollect, 'DEC', 'DEB');
      },
    },
    {
      id: 'AMR Shishio Vortex of the Thunder Eye',
      type: 'StartsUsing',
      // 8413 = Eye of the Thunder Vortex (out)
      // 8415 = Vortex of the Thnder Eye (in)
      netRegex: { id: ['8413', '8415'], source: 'Shishio' },
      durationSeconds: 7,
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          out: Outputs.out,
          in: Outputs.in,
          spreadThenMeleeStack: {
            en: '${inOut} + Spread => ${outIn} + Melees Stack',
            de: '${inOut} + Verteilen => ${outIn} + Nahkämpfer sammeln',
            fr: '${inOut} + Écartement => ${outIn} + Package mêlées',
            ja: '${inOut} + 散会 => ${outIn} + 近接ペア',
            cn: '${inOut} + 分散 => ${outIn} + 近战分摊',
            ko: '${inOut} + 산개 => ${outIn} + 근딜 쉐어',
          },
          spreadThenRoleStack: {
            en: '${inOut} + Spread => ${outIn} + Role Stacks',
            de: '${inOut} + Verteilen => ${outIn} + Rollengruppe sammeln',
            fr: '${inOut} + Écartement => ${outIn} + Package par rôle',
            ja: '${inOut} + 散会 => ${outIn} + ロールペア',
            cn: '${inOut} + 分散 => ${outIn} + 职能分摊',
            ko: '${inOut} + 산개 => ${outIn} + 역할별 쉐어',
          },
          spreadThenPartnerStack: {
            en: '${inOut} + Spread => ${outIn} + Partner Stacks',
            de: '${inOut} + Verteilen => ${outIn} + Partner sammeln',
            fr: '${inOut} + Écartement => ${outIn} + Package partenaire',
            ja: '${inOut} + 散会 => ${outIn} + ペア',
            cn: '${inOut} + 分散 => ${outIn} + 和搭档分摊',
            ko: '${inOut} + 산개 => ${outIn} + 파트너 쉐어',
          },
          meleeStackThenSpread: {
            en: '${inOut} + Melees Stack => ${outIn} + Spread',
            de: '${inOut} + Nahkämpfer sammeln => ${outIn} + Verteilen',
            fr: '${inOut} + Package mêlées => ${outIn} + Écartement',
            ja: '${inOut} + 近接ペア => ${outIn} + 散会',
            cn: '${inOut} + 近战分摊 => ${outIn} + 分散',
            ko: '${inOut} + 근딜 쉐어 => ${outIn} + 산개',
          },
          roleStackThenSpread: {
            en: '${inOut} + Role Stacks => ${outIn} + Spread',
            de: '${inOut} + Rollengruppe sammeln => ${outIn} + Verteilen',
            fr: '${inOut} + Package par rôle => ${outIn} + Écartement',
            ja: '${inOut} + ロールペア => ${outIn} + 散会',
            cn: '${inOut} + 职能分摊 => ${outIn} + 分散',
            ko: '${inOut} + 역할별 쉐어 => ${outIn} + 산개',
          },
          partnerStackThenSpread: {
            en: '${inOut} + Partner Stacks => ${outIn} + Spread',
            de: '${inOut} + Partner sammeln => ${outIn} + Verteilen',
            fr: '${inOut} + Package partenaire  => ${outIn} + Écartement',
            ja: '${inOut} + ペア => ${outIn} + 散会',
            cn: '${inOut} + 和搭档分摊 => ${outIn} + 分散',
            ko: '${inOut} + 파트너 쉐어 => ${outIn} + 산개',
          },
          spreadThenStack: {
            en: '${inOut} + Spread => ${outIn} + Stack',
            de: '${inOut} + Verteilen => ${outIn} + Sammeln',
            fr: '${inOut} + Écartement => ${outIn} + Package',
            ja: '${inOut} + 散会 => ${outIn} + ペア',
            cn: '${inOut} + 分散 => ${outIn} + 分摊',
            ko: '${inOut} + 산개 => ${outIn} + 쉐어',
          },
          stackThenSpread: {
            en: '${inOut} + Stack => ${outIn} + Spread',
            de: '${inOut} + Sammeln => ${outIn} + Verteilen',
            fr: '${inOut} + Package => ${outIn} + Écartement',
            ja: '${inOut} + ペア => ${outIn} + 散会',
            cn: '${inOut} + 分摊 => ${outIn} + 分散',
            ko: '${inOut} + 쉐어 => ${outIn} + 산개',
          },
          stacks: {
            en: 'Stacks: ${player1}, ${player2}',
            de: 'Sammeln: ${player1}, ${player2}',
            fr: 'Package : ${player1}, ${player2}',
            ja: '頭割り: ${player1}, ${player2}',
            cn: '分摊点: ${player1}, ${player2}',
            ko: '쉐어: ${player1}, ${player2}',
          },
        };

        const [stack1, stack2] = data.wailingCollect.filter((x) => x.effectId === 'DEC');
        const spread = data.wailingCollect.find((x) => x.effectId === 'DEB');
        if (stack1 === undefined || stack2 === undefined || spread === undefined)
          return;
        const stackTime = parseFloat(stack1.duration);
        const spreadTime = parseFloat(spread.duration);
        const isStackFirst = stackTime < spreadTime;

        const stackType = findStackPartners(data, stack1.target, stack2.target);

        const isInFirst = matches.id === '8415';
        const inOut = isInFirst ? output.in!() : output.out!();
        const outIn = isInFirst ? output.out!() : output.in!();
        const args = { inOut: inOut, outIn: outIn };

        const stacks = [stack1, stack2].map((x) => x.target).sort();
        const [player1, player2] = stacks.map((x) => data.party.member(x));
        const stackInfo = { infoText: output.stacks!({ player1: player1, player2: player2 }) };

        data.vortexSecondMechanic = isInFirst ? 'out' : 'in';
        data.stackSpreadFirstMechanic = isStackFirst ? stackType : 'spread';
        data.stackSpreadSecondMechanic = isStackFirst ? 'spread' : stackType;

        if (stackType === 'melee') {
          if (isStackFirst)
            return { alertText: output.meleeStackThenSpread!(args), ...stackInfo };
          return { alertText: output.spreadThenMeleeStack!(args), ...stackInfo };
        } else if (stackType === 'role') {
          if (isStackFirst)
            return { alertText: output.roleStackThenSpread!(args), ...stackInfo };
          return { alertText: output.spreadThenRoleStack!(args), ...stackInfo };
        } else if (stackType === 'partner') {
          if (isStackFirst)
            return { alertText: output.partnerStackThenSpread!(args), ...stackInfo };
          return { alertText: output.spreadThenPartnerStack!(args), ...stackInfo };
        }

        // 'unknown' catch-all
        if (isStackFirst)
          return { alertText: output.stackThenSpread!(args), ...stackInfo };
        return { alertText: output.spreadThenStack!(args), ...stackInfo };
      },
    },
    {
      id: 'AMR Shishio Vortex of the Thunder Eye Followup',
      type: 'Ability',
      // 8418 = Unnatural Ailment
      // 8419 = Unnatural Force
      netRegex: { id: ['8418', '8419'], capture: false },
      condition: (data) => data.wailCount !== 1,
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        const mech = data.stackSpreadSecondMechanic;
        if (mech === undefined)
          return;
        delete data.stackSpreadFirstMechanic;
        delete data.stackSpreadSecondMechanic;
        const mechanicStr = output[mech]!();

        const inOut = data.vortexSecondMechanic;
        if (inOut === undefined)
          return;
        delete data.vortexSecondMechanic;

        const inOutStr = output[inOut]!();
        return output.text!({ inOut: inOutStr, mechanic: mechanicStr });
      },
      outputStrings: {
        text: {
          en: '${inOut} + ${mechanic}',
          de: '${inOut} + ${mechanic}',
          fr: '${inOut} + ${mechanic}',
          ja: '${inOut} + ${mechanic}',
          cn: '${inOut} + ${mechanic}',
          ko: '${inOut} + ${mechanic}',
        },
        out: Outputs.out,
        in: Outputs.in,
        ...basicStackSpreadOutputStrings,
      },
    },
    {
      id: 'AMR Shishio Thunder Vortex',
      type: 'StartsUsing',
      netRegex: { id: '8412', source: 'Shishio', capture: false },
      response: Responses.getUnder('alert'),
    },
    {
      id: 'AMR Shishio Devilish Thrall Collect',
      type: 'StartsUsing',
      // 840B = Right Swipe
      // 840C = Left Swipe
      netRegex: { id: ['840B', '840C'], source: 'Devilish Thrall' },
      run: (data, matches) => data.devilishThrallCollect.push(matches),
    },
    {
      id: 'AMR Shishio Devilish Thrall Safe Spot',
      type: 'StartsUsing',
      // Note: the second call of this comes out before the first one happens,
      // but it's important to know where you're going.
      netRegex: { id: ['840B', '840C'], source: 'Devilish Thrall', capture: false },
      delaySeconds: 0.5,
      durationSeconds: 6,
      suppressSeconds: 1,
      promise: async (data) => {
        data.combatantData = [];

        const ids = data.devilishThrallCollect.map((x) => parseInt(x.sourceId, 16));
        data.combatantData = (await callOverlayHandler({
          call: 'getCombatants',
          ids: ids,
        })).combatants;
      },
      alertText: (data, _matches, output) => {
        if (data.combatantData.length !== 4)
          return;
        const centerX = 0;
        const centerY = -100;

        // Intercard thralls:
        //   x = 0 +/- 10
        //   y = -100 +/- 10
        //   heading = intercards (pi/4 + pi/2 * n)
        // Cardinal thralls:
        //   x = 0 +/- 12
        //   y = -100 +/- 12
        //   heading = cardinals (pi/2 * n)

        // One is a set of four on cardinals, the others a set of 4 on intercards.
        // There seems to be only one pattern of thralls, rotated.
        // Two are pointed inward (direct opposite to their position)
        // and two are pointed outward (perpendicular to their position).
        // Because of this, no need to check left/right cleave as position and directions tell all.
        const states = data.combatantData.map((combatant) => {
          return {
            dir: Directions.combatantStatePosTo8Dir(combatant, centerX, centerY),
            heading: Directions.combatantStateHdgTo8Dir(combatant),
          };
        });
        const outwardStates = states.filter((state) => state.dir !== (state.heading + 4) % 8);
        const [pos1, pos2] = outwardStates.map((x) => x.dir).sort();
        if (pos1 === undefined || pos2 === undefined || outwardStates.length !== 2)
          return;

        const mech = data.stackSpreadFirstMechanic ?? data.stackSpreadSecondMechanic;
        const mechanicStr = mech !== undefined ? output[mech]!() : output.unknownMech!();

        if (data.stackSpreadFirstMechanic)
          delete data.stackSpreadFirstMechanic;
        else if (data.stackSpreadSecondMechanic)
          delete data.stackSpreadSecondMechanic;

        // 0/6 (average 7) and 1/7 (average 0) are the two cases where the difference is 6 and not 2.
        const averagePos = Math.floor((pos2 + pos1 + (pos2 - pos1 === 6 ? 8 : 0)) / 2) % 8;
        const params = { mechanic: mechanicStr } as const;
        return {
          0: output.north!(params),
          1: output.northeast!(params),
          2: output.east!(params),
          3: output.southeast!(params),
          4: output.south!(params),
          5: output.southwest!(params),
          6: output.west!(params),
          7: output.northwest!(params),
        }[averagePos];
      },
      run: (data) => data.devilishThrallCollect = [],
      outputStrings: {
        north: {
          en: 'North Diamond + ${mechanic}',
          de: 'nördlicher Diamant + ${mechanic}',
          fr: 'Diamant Nord + ${mechanic}',
          ja: '北 + ${mechanic}',
          cn: '上菱形 + ${mechanic}',
          ko: '북쪽 + ${mechanic}',
        },
        east: {
          en: 'East Diamond + ${mechanic}',
          de: 'östlicher Diamant + ${mechanic}',
          fr: 'Diamant Est + ${mechanic}',
          ja: '東 + ${mechanic}',
          cn: '右菱形 + ${mechanic}',
          ko: '동쪽 + ${mechanic}',
        },
        south: {
          en: 'South Diamond + ${mechanic}',
          de: 'südlicher Diamant + ${mechanic}',
          fr: 'Diamant Sud + ${mechanic}',
          ja: '南 + ${mechanic}',
          cn: '下菱形 + ${mechanic}',
          ko: '남쪽 + ${mechanic}',
        },
        west: {
          en: 'West Diamond + ${mechanic}',
          de: 'westlicher Diamant + ${mechanic}',
          fr: 'Diamant Ouest + ${mechanic}',
          ja: '西 + ${mechanic}',
          cn: '左菱形 + ${mechanic}',
          ko: '서쪽 + ${mechanic}',
        },
        northeast: {
          en: 'Northeast Square + ${mechanic}',
          de: 'nordöstliches Viereck + ${mechanic}',
          fr: 'Carré Nord-Est + ${mechanic}',
          ja: '北東 + ${mechanic}',
          cn: '右上 正方形 + ${mechanic}',
          ko: '북동쪽 + ${mechanic}',
        },
        southeast: {
          en: 'Southeast Square + ${mechanic}',
          de: 'südöstliches Viereck + ${mechanic}',
          fr: 'Carré Sud-Est + ${mechanic}',
          ja: '南東 + ${mechanic}',
          cn: '右下 正方形 + ${mechanic}',
          ko: '남동쪽 + ${mechanic}',
        },
        southwest: {
          en: 'Southwest Square + ${mechanic}',
          de: 'südwestliches Viereck + ${mechanic}',
          fr: 'Carré Sud-Ouest + ${mechanic}',
          ja: '南西 + ${mechanic}',
          cn: '左下 正方形 + ${mechanic}',
          ko: '남서쪽 + ${mechanic}',
        },
        northwest: {
          en: 'Northwest Square + ${mechanic}',
          de: 'nordwestliches Viereck + ${mechanic}',
          fr: 'Carré Nord-Ouest + ${mechanic}',
          ja: '北西 + ${mechanic}',
          cn: '左上 正方形 + ${mechanic}',
          ko: '북서쪽 + ${mechanic}',
        },
        ...basicStackSpreadOutputStrings,
        unknownMech: Outputs.unknown,
      },
    },
    {
      id: 'AMR Shishio Haunting Thrall Reisho Count',
      type: 'Ability',
      // Sometimes these adds have not changed their name from Shishio to Haunting Thrall.
      netRegex: { id: '840D', capture: false },
      preRun: (data) => data.reishoCount++,
      durationSeconds: 1.5,
      // There are 8 pulses, 2 seconds apart.
      suppressSeconds: 0.5,
      // Play an alarm on the 8th one, but don't play noises for each count.
      sound: (data) => data.ghostMechanic === 'tower' && data.reishoCount === 8 ? undefined : '',
      alarmText: (data, _matches, output) => {
        if (data.ghostMechanic === 'tower' && data.reishoCount === 8)
          return output.tower!();
      },
      infoText: (data, _matches, output) => output[`num${data.reishoCount}`]!(),
      outputStrings: {
        tower: {
          en: 'Tower',
          de: 'Türme',
          fr: 'Tour',
          ja: '塔',
          cn: '塔',
          ko: '기둥',
        },
        num1: Outputs.num1,
        num2: Outputs.num2,
        num3: Outputs.num3,
        num4: Outputs.num4,
        num5: Outputs.num5,
        num6: Outputs.num6,
        num7: Outputs.num7,
        num8: Outputs.num8,
      },
    },
    {
      id: 'AMR Shishio Haunting Thrall Headmarker',
      type: 'HeadMarker',
      netRegex: { id: '01D8' },
      condition: (data, matches) => {
        data.ghostHeadmarkers.push(matches);
        return data.ghostHeadmarkers.length === 2;
      },
      alertText: (data, _matches, output) => {
        const spread = data.ghostHeadmarkers.map((x) => x.target);
        const towers = data.party.partyNames.filter((x) => !spread.includes(x));

        if (spread.includes(data.me)) {
          data.ghostMechanic = 'spread';
          const otherPlayer = spread.find((x) => x !== data.me) ?? output.unknown!();
          return output.spread!({ player: data.party.member(otherPlayer) });
        }

        data.ghostMechanic = 'tower';
        const otherPlayer = towers.find((x) => x !== data.me) ?? output.unknown!();
        return output.tower!({ player: data.party.member(otherPlayer) });
      },
      outputStrings: {
        tower: {
          en: 'Get Tower (w/${player})',
          de: 'Nimm Turm mit (w/${player})',
          fr: 'Prenez une tour (avec ${player})',
          ja: '塔踏み (${player})',
          cn: '踩塔 (与${player})',
          ko: '기둥 들어가기 (+${player})',
        },
        spread: {
          en: 'Spread (w/${player})',
          de: 'Verteilen (w/${player})',
          fr: 'Écartez-vous (avec ${player})',
          ja: '散会 (${player})',
          cn: '分散 (与${player})',
          ko: '산개 들어가기 (+${player})',
        },
        unknown: Outputs.unknown,
      },
    },
    // ---------------- second trash ----------------
    {
      id: 'AMR Shishu Kotengu Backward Blows',
      type: 'StartsUsing',
      netRegex: { id: '865C', source: 'Shishu Kotengu', capture: false },
      durationSeconds: 5.7,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Sides (Stay Sides)',
          de: 'Seiten (Seitlich bleiben)',
          fr: 'Côtés (Restez sur les côtes',
          ja: '横へ (そのまま横)',
          cn: '两侧 (待在两侧)',
          ko: '양 옆 (양 옆에 있기)',
        },
      },
    },
    {
      id: 'AMR Shishu Kotengu Leftward Blows',
      type: 'StartsUsing',
      netRegex: { id: '865D', source: 'Shishu Kotengu', capture: false },
      durationSeconds: 5.7,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Right + Behind',
          de: 'Rechts + Hinten',
          fr: 'Droite + Derrière',
          ja: '右 + 後ろ',
          cn: '右右右 + 去背后',
          ko: '오른쪽 + 뒤',
        },
      },
    },
    {
      id: 'AMR Shishu Kotengu Rightward Blows',
      type: 'StartsUsing',
      netRegex: { id: '865E', source: 'Shishu Kotengu', capture: false },
      durationSeconds: 5.7,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Left + Behind',
          de: 'Links + Hinten',
          fr: 'Gauche + Derrière',
          ja: '左 + 後ろ',
          cn: '左左左 + 去背后',
          ko: '왼쪽 + 뒤',
        },
      },
    },
    {
      id: 'AMR Shishu Kotengu Wrath of the Tengu',
      type: 'StartsUsing',
      netRegex: { id: '8660', source: 'Shishu Kotengu', capture: false },
      response: Responses.bleedAoe(),
    },
    {
      id: 'AMR Shishu Kotengu Gaze of the Tengu',
      type: 'StartsUsing',
      netRegex: { id: '8661', source: 'Shishu Kotengu', capture: false },
      response: Responses.lookAway('alert'),
    },
    {
      id: 'AMR Shishu Onmitsugashira Juji Shuriken',
      type: 'StartsUsing',
      netRegex: { id: '8664', source: 'Shishu Onmitsugashira', capture: false },
      response: Responses.getBehind(),
    },
    {
      id: 'AMR Shishu Onmitsugashira Issen',
      type: 'StartsUsing',
      netRegex: { id: '8662', source: 'Shishu Onmitsugashira' },
      response: Responses.tankBuster(),
    },
    {
      id: 'AMR Shishu Onmitsugashira Huton',
      type: 'StartsUsing',
      netRegex: { id: '8663', source: 'Shishu Onmitsugashira', capture: false },
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Dodge 4x Shuriken',
          de: 'Weiche 4x Shuriken aus',
          fr: 'Évitez le shuriken x4',
          ja: '4x 手裏剣',
          cn: '躲避 4 次手里剑',
          ko: '수리검 4개 피하기',
        },
      },
    },
    // ---------------- Gorai the Uncaged ----------------
    {
      id: 'AMR Gorai Unenlightenment',
      type: 'StartsUsing',
      netRegex: { id: '8534', source: 'Gorai the Uncaged', capture: false },
      response: Responses.bleedAoe('info'),
    },
    {
      id: 'AMR Gorai Brazen Ballad Purple',
      type: 'StartsUsing',
      netRegex: { id: '8509', source: 'Gorai the Uncaged', capture: false },
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid Expanding Lines',
          de: 'Weiche den größer werdenden Linien aus',
          fr: 'Évitez les lignes en expansion',
          ja: 'AOE回避',
          cn: '远离扩大连线',
          ko: '커지는 장판들 피하기',
        },
      },
    },
    {
      id: 'AMR Gorai Brazen Ballad Blue',
      type: 'StartsUsing',
      netRegex: { id: '850A', source: 'Gorai the Uncaged', capture: false },
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Under Rock + Lines',
          de: 'Unter dem Stein + Linien',
          fr: 'Sous le rocher + lignes',
          ja: '石の下へ + 直線AOE',
          cn: '站在石头和线下',
          ko: '바위 밑으로 + 직선장판',
        },
      },
    },
    {
      id: 'AMR Gorai Sparks Count',
      type: 'StartsUsing',
      netRegex: { id: '8503', source: 'Gorai the Uncaged', capture: false },
      run: (data) => {
        data.sparksCount++;
        data.sparksCollect = [];
      },
    },
    {
      id: 'AMR Gorai Sparks Collect',
      type: 'GainsEffect',
      // E17 = Live Brazier (stack)
      // E18 = Live Candle (spread)
      netRegex: { effectId: ['E17', 'E18'] },
      run: (data, matches) => data.sparksCollect.push(matches),
    },
    {
      id: 'AMR Gorai Seal of Scurrying Sparks Flame and Sulphur',
      type: 'GainsEffect',
      netRegex: { effectId: ['E17', 'E18'], capture: false },
      condition: (data) => data.sparksCount !== 2,
      delaySeconds: 0.5,
      suppressSeconds: 10,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          meleeStack: basicStackSpreadOutputStrings.melee,
          roleStack: basicStackSpreadOutputStrings.role,
          partnerStack: basicStackSpreadOutputStrings.partner,
          stacks: {
            en: 'Stacks: ${player1}, ${player2}',
            de: 'Sammeln: ${player1}, ${player2}',
            fr: 'Package : ${player1}, ${player2}',
            ja: '頭割り: ${player1}, ${player2}',
            cn: '分摊点: ${player1}, ${player2}',
            ko: '쉐어: ${player1}, ${player2}',
          },
        };

        const [stack1, stack2] = data.sparksCollect.filter((x) => x.effectId === 'E17');
        if (stack1 === undefined || stack2 === undefined)
          return;

        const stackType = findStackPartners(data, stack1.target, stack2.target);

        const stacks = [stack1, stack2].map((x) => x.target).sort();
        const [player1, player2] = stacks.map((x) => data.party.member(x));
        const stackInfo = { infoText: output.stacks!({ player1: player1, player2: player2 }) };

        if (stackType === 'melee') {
          return { alertText: output.meleeStack!(), ...stackInfo };
        } else if (stackType === 'role') {
          return { alertText: output.roleStack!(), ...stackInfo };
        } else if (stackType === 'partner') {
          return { alertText: output.partnerStack!(), ...stackInfo };
        }

        // 'unknown' catch-all
        return stackInfo;
      },
    },
    {
      id: 'AMR Gorai Seal of Scurrying Sparks Cloud to Ground',
      type: 'GainsEffect',
      netRegex: { effectId: ['E17', 'E18'], capture: false },
      condition: (data) => data.sparksCount === 2,
      delaySeconds: 0.5,
      suppressSeconds: 10,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        return stackSpreadResponse(data, output, data.sparksCollect, 'E17', 'E18');
      },
    },
    {
      id: 'AMR Gorai Seal of Scurrying Sparks Cloud to Ground Followup',
      type: 'Ability',
      // 8505 = Greater Ball of Fire
      // 8605 = Great Ball of Fire
      netRegex: { id: ['8505', '8506'], capture: false },
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        const mech = data.stackSpreadSecondMechanic;
        if (mech === undefined)
          return;
        delete data.stackSpreadFirstMechanic;
        delete data.stackSpreadSecondMechanic;
        return output[mech]!();
      },
      outputStrings: basicStackSpreadOutputStrings,
    },
    {
      id: 'AMR Gorai Torching Torment',
      type: 'StartsUsing',
      netRegex: { id: '8532', source: 'Gorai the Uncaged' },
      response: Responses.tankBuster(),
    },
    {
      id: 'AMR Gorai Impure Purgation First Hit',
      type: 'StartsUsing',
      netRegex: { id: '852F', source: 'Gorai the Uncaged', capture: false },
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Protean',
          de: 'Um den Boss verteilen',
          fr: 'Position autour du boss',
          ja: 'ボス基準て散開',
          cn: '四方分散',
          ko: '산개',
        },
      },
    },
    {
      id: 'AMR Gorai Impure Purgation Second Hit',
      type: 'StartsUsing',
      netRegex: { id: '8531', source: 'Gorai the Uncaged', capture: false },
      suppressSeconds: 5,
      response: Responses.moveAway(),
    },
    {
      id: 'AMR Gorai Humble Hammer',
      type: 'StartsUsing',
      netRegex: { id: '8525', source: 'Gorai the Uncaged' },
      condition: Conditions.targetIsYou(),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Shrink Lone Orb',
          de: 'Einzel-Orb verkleinern',
          fr: 'Réduire l\'orbe isolé',
          ja: '玉の処理',
          cn: '缩小单独的球',
          ko: '혼자 있는 구슬 작아지게 만들기',
        },
      },
    },
    {
      id: 'AMR Gorai Flintlock',
      type: 'StartsUsing',
      // Trigger this on the Humble Hammer damage; however this should hit
      // both one player (although possibly more) and one Ball of Levin (although possibly none)
      // so use `StartsUsing` with a delay to get the proper cast target here.
      netRegex: { id: '8525', source: 'Gorai the Uncaged' },
      delaySeconds: (_data, matches) => parseFloat(matches.castTime),
      alertText: (data, matches, output) => {
        if (matches.target === data.me)
          return output.beBehindTank!();
        if (data.role === 'tank')
          return output.blockLaser!({ player: data.party.member(matches.target) });
        return output.avoidLaser!();
      },
      outputStrings: {
        beBehindTank: {
          en: 'Stay Behind Tank',
          de: 'Hinter dem Tank stehen',
          fr: 'Restez derrière le tank',
          ja: 'タンクの後ろ',
          cn: '站坦克后面',
          ko: '탱커 뒤에 서기',
        },
        blockLaser: {
          en: 'Block Laser on ${player}',
          de: 'Blockiere Laser auf ${player}',
          fr: 'Bloquer le laser sur ${player}',
          ja: '${player}の前でカバー',
          cn: '挡枪 ${player}',
          ko: '${player} 대상 레이저 앞에서 맞기',
        },
        avoidLaser: {
          en: 'Avoid Laser',
          de: 'Laser vermeiden',
          fr: 'Évitez le laser',
          ja: 'レイザー回避',
          cn: '躲避激光',
          ko: '레이저 피하기',
        },
      },
    },
    {
      id: 'AMR Gorai Rousing Reincarnation Collect',
      type: 'GainsEffect',
      netRegex: { effectId: ['E0D', 'E0E', 'E0F', 'E10', 'E11', 'E12', 'E13', 'E14'] },
      condition: (data) => data.rousingTowerCount === 0,
      run: (data, matches) => {
        // Odder Incarnation = blue towers
        // Rodential Rebirth = orange towers
        // durations: I = 20s, II = 26s, III = 32s, IV = 38s
        const id = matches.effectId;
        if (id === 'E11')
          data.rousingCollect[0].blue = matches.target;
        else if (id === 'E0D')
          data.rousingCollect[0].orange = matches.target;
        else if (id === 'E12')
          data.rousingCollect[1].blue = matches.target;
        else if (id === 'E0E')
          data.rousingCollect[1].orange = matches.target;
        else if (id === 'E13')
          data.rousingCollect[2].blue = matches.target;
        else if (id === 'E0F')
          data.rousingCollect[2].orange = matches.target;
        else if (id === 'E14')
          data.rousingCollect[3].blue = matches.target;
        else if (id === 'E10')
          data.rousingCollect[3].orange = matches.target;
      },
    },
    {
      id: 'AMR Gorai Rousing Reincarnation First Tower',
      type: 'StartsUsing',
      // Malformed Prayer cast
      netRegex: { id: '8518', source: 'Gorai the Uncaged', capture: false },
      durationSeconds: 15,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        return towerResponse(data, output);
      },
    },
    {
      id: 'AMR Gorai Rousing Reincarnation Other Towers',
      type: 'Ability',
      // Technically 851F Pointed Purgation protean happens ~0.2s beforehand,
      // but wait on the tower burst to call things out.
      // 851B = Burst (blue tower)
      // 8519 = Burst (orange tower)
      // 851C = Dramatic Burst (missed tower)
      netRegex: { id: '851B', source: 'Gorai the Uncaged', capture: false },
      durationSeconds: 4,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        return towerResponse(data, output);
      },
    },
    {
      id: 'AMR Gorai Fighting Spirits',
      type: 'StartsUsing',
      netRegex: { id: '852B', source: 'Gorai the Uncaged', capture: false },
      // this is also a light aoe but knockback is more important
      response: Responses.knockback('info'),
    },
    {
      id: 'AMR Gorai Fighting Spirits Limit Cut',
      type: 'HeadMarker',
      netRegex: { id: limitCutIds },
      condition: Conditions.targetIsYou(),
      durationSeconds: 6,
      alertText: (_data, matches, output) => {
        if (matches.id === headmarkers.limitCut1)
          return output.num1!();
        if (matches.id === headmarkers.limitCut2)
          return output.num2!();
        if (matches.id === headmarkers.limitCut3)
          return output.num3!();
        if (matches.id === headmarkers.limitCut4)
          return output.num4!();
      },
      outputStrings: {
        num1: Outputs.num1,
        num2: Outputs.num2,
        num3: Outputs.num3,
        num4: Outputs.num4,
      },
    },
    {
      id: 'AMR Gorai Malformed Reincarnation Collect',
      type: 'GainsEffect',
      // E0D = Rodential Rebirth 1 (first orange tower)
      // E0E = Rodential Rebirth 2 (second orange tower)
      // E0F = Rodential Rebirth 3 (third orange tower)
      // E10 = Rodential Rebirth 4 (fourth orange tower)
      // E11 = Odder Incarnation 1 (first blue tower)
      // E12 = Odder Incarnation 2 (second blue tower)
      // E13 = Odder Incarnation 3 (third blue tower)
      // E14 = Odder Incarnation 4 (fourth blue tower)
      // E15 = Squirrelly Prayer (place orange tower)
      // E16 = Odder Prayer (place blue tower)
      netRegex: { effectId: ['E0D', 'E0E', 'E0F', 'E11', 'E12', 'E13'] },
      condition: (data) => data.rousingTowerCount !== 0,
      run: (data, matches) => {
        data.malformedCollect.push(matches);
        if (matches.target === data.me)
          data.myMalformedEffects.push(matches.effectId);
      },
    },
    {
      id: 'AMR Gorai Malformed Reincarnation',
      // TODO: we could add more config options for this if needed, as there are many strats.
      // However, this given trigger should give enough info for most strats.
      // (1) player flex, always go mixed sides, people with all one color go to specific spots.
      //     See: https://www.youtube.com/watch?v=TzoNEWbMpQ0#t=7m53s
      // (2) no player flexing, go to opposite side, run THROUGH, possible swap sides for tower
      //     See: https://ff14.toolboxgaming.space/?id=938195953989861&preview=1
      // (3) different strats for half mixed / full mixed, flex only on full mixed
      //     See: https://raidplan.io/plan/9tVR4vj9kPjgF3PM
      comment: {
        en: `Full mixed means everybody has both colors (two of one, one of the other).
             Half mixed means two people have both colors and two people have all the same color.`,
        de:
          `Voll gemischt bedeutet, dass jeder beide Farben hat (zwei von der einen, eine von der anderen).
             Halb gemischt bedeutet, dass zwei Personen beide Farben haben und zwei Personen nur eine Farbe haben`,
        fr:
          `Complètement mixé signifie que tout le monde à les deux couleurs (deux de l'une et un de l'autre).
           Mixé à moitié signifie que deux personnes ont les deux couleurs et deux ont la même couleur.`,
        cn: `“全异色” 指的是所有人的 3 个 buff 都有 2 种颜色 (2 个是一种颜色, 剩下 1 个是另一种)。
             “半异色” 指的是有 2 人的 3 个 buff 有 2 种颜色, 另外 2 人的 3 个 buff 全部是同一种颜色。`,
        ko: `완전 혼합은 모든 사람이 두 가지 색을 가지고 있음을 의미합니다 (한 가지 색 두 개, 다른 색 하나).
             반혼합은 두 사람이 두 가지 종류를 가지고 있고, 다른 두 사람은 모두 같은 색을 가지고 있음을 의미합니다.`,
      },
      type: 'GainsEffect',
      netRegex: { effectId: ['E0D', 'E0E', 'E0F', 'E11', 'E12', 'E13'], capture: false },
      condition: (data) => data.rousingTowerCount !== 0,
      delaySeconds: 0.5,
      durationSeconds: 10,
      suppressSeconds: 1,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          alertText: {
            en: '${color1} -> ${color2} -> ${color3} (${mixedType})',
            de: '${color1} -> ${color2} -> ${color3} (${mixedType})',
            fr: '${color1} -> ${color2} -> ${color3} (${mixedType})',
            ja: '${color1} -> ${color2} -> ${color3} (${mixedType})',
            cn: '${color1} -> ${color2} -> ${color3} (${mixedType})',
            ko: '${color1} -> ${color2} -> ${color3} (${mixedType})',
          },
          infoText: {
            en: '(first ${color} w/${player})',
            de: '(zuerst ${color} mit ${player})',
            fr: '(premier ${color} avec ${player})',
            ja: '1番 ${color} +${player}',
            cn: '(第一个 ${color} 和 ${player})',
            ko: '1번 ${color} +${player}',
          },
          orange: {
            en: 'Orange',
            de: 'Orange',
            fr: 'Orange',
            ja: '赤',
            cn: '橙色',
            ko: '주황',
          },
          blue: {
            en: 'Blue',
            de: 'Blau',
            fr: 'Bleu',
            ja: '青',
            cn: '蓝色',
            ko: '파랑',
          },
          mixedTypeFull: {
            en: 'full mixed',
            de: 'Voll gemischt',
            fr: 'Complètement mixé',
            ja: '全混合',
            cn: '全异色',
            ko: '완전 혼합',
          },
          mixedTypeHalf: {
            en: 'half mixed',
            de: 'Halb gemischt',
            fr: 'Mixé à moitié',
            ja: '半分混合',
            cn: '半异色',
            ko: '반혼합',
          },
          unknown: Outputs.unknown,
        };

        let playerCount = 0;
        let mixedCount = 0;
        type Color = 'blue' | 'orange';
        const firstColor: { [name: string]: Color } = {};
        const myColors: Color[] = [];

        for (const line of data.malformedCollect) {
          const isOrange = line.effectId === 'E0D' || line.effectId === 'E0E' ||
            line.effectId === 'E0F';
          const color = isOrange ? 'orange' : 'blue';
          if (line.target === data.me)
            myColors.push(color);
          const lastColor = firstColor[line.target];
          if (lastColor === undefined) {
            playerCount++;
            firstColor[line.target] = color;
            continue;
          }
          if (lastColor === color)
            continue;
          mixedCount++;
        }

        const [color1, color2, color3] = myColors;
        if (color1 === undefined || color2 === undefined || color3 === undefined)
          return;

        // Try to handle dead players who don't have debuffs here.
        const isAllMixed = playerCount === mixedCount;
        const mixedType = isAllMixed ? output.mixedTypeFull!() : output.mixedTypeHalf!();

        let partner: string | PartyMemberParamObject = output.unknown!();
        for (const [name, color] of Object.entries(firstColor)) {
          if (name !== data.me && color === color1) {
            partner = data.party.member(name);
            break;
          }
        }

        const alertText = output.alertText!({
          color1: output[color1]!(),
          color2: output[color2]!(),
          color3: output[color3]!(),
          mixedType: mixedType,
        });
        const infoText = output.infoText!({ color: output[color1]!(), player: partner });
        return { alertText, infoText };
      },
    },
    {
      id: 'AMR Gorai Malformed First Tower',
      type: 'LosesEffect',
      // E15 = Squirrelly Prayer (place orange tower)
      // E16 = Odder Prayer (place blue tower)
      netRegex: { effectId: ['E15', 'E16'] },
      condition: (data, matches) => data.me === matches.target,
      durationSeconds: 4,
      alertText: (data, _matches, output) => {
        const effectId = data.myMalformedEffects.shift();
        if (effectId === 'E0D')
          return output.orangeTower1!();
        if (effectId === 'E11')
          return output.blueTower1!();
      },
      outputStrings: {
        blueTower1: {
          en: 'Inside Blue Tower 1',
          de: 'Innerhalb blauer Turm 1',
          fr: 'À l\'intérieur de la tour bleue 1',
          ja: '内側の青塔1',
          cn: '内侧 蓝塔 1',
          ko: '안쪽 파랑 기둥1',
        },
        orangeTower1: {
          en: 'Inside Orange Tower 1',
          de: 'Innerhalb orangener Turm 1',
          fr: 'À l\'intérieur de la tour orange 1',
          ja: '内側の赤塔1',
          cn: '内侧 橙塔 1',
          ko: '안쪽 주황 기둥1',
        },
      },
    },
    {
      id: 'AMR Gorai Malformed Other Towers',
      type: 'Ability',
      netRegex: { id: '851B', source: 'Gorai the Uncaged', capture: false },
      condition: (data) => data.myMalformedEffects.length > 0,
      durationSeconds: 2,
      suppressSeconds: 1,
      alertText: (data, _matches, output) => {
        const effectId = data.myMalformedEffects.shift();
        if (effectId === 'E0E')
          return output.orangeTower2!();
        if (effectId === 'E0F')
          return output.orangeTower3!();
        if (effectId === 'E12')
          return output.blueTower2!();
        if (effectId === 'E13')
          return output.blueTower3!();
      },
      outputStrings: {
        blueTower1: {
          en: 'Inside Blue Tower 1',
          de: 'Mittig blauer Turm 1',
          fr: 'À l\'intérieur de la tour bleue 1',
          ja: '内側の青塔1',
          cn: '内侧 蓝塔 1',
          ko: '안쪽 파랑 기둥 1',
        },
        orangeTower1: {
          en: 'Inside Orange Tower 1',
          de: 'Mittig orangener Turm 1',
          fr: 'À l\'intérieur de la tour orange 1',
          ja: '内側の赤塔1',
          cn: '内侧 橙塔 1',
          ko: '안쪽 주황 기둥 1',
        },
        blueTower2: {
          en: 'Corner Blue Tower 2',
          de: 'Ecke blauer Turm 2',
          fr: 'Tour bleu 2 dans le coin',
          ja: '隅の青塔2',
          cn: '角落 蓝塔 2',
          ko: '구석 파랑 기둥 2',
        },
        orangeTower2: {
          en: 'Corner Orange Tower 2',
          de: 'Ecke orangener Turm 2',
          fr: 'Tour orange 2 dans le coin',
          ja: '隅の赤塔2',
          cn: '角落 橙塔 2',
          ko: '구석 주황 기둥 2',
        },
        blueTower3: {
          en: 'Placed Blue Tower 3',
          de: 'Platzierter blauer Turm 3',
          fr: 'Tour bleue placée 3',
          ja: '設置した青塔3',
          cn: '放置 蓝塔 3',
          ko: '설치한 파랑 기둥 3',
        },
        orangeTower3: {
          en: 'Placed Orange Tower 3',
          de: 'Platzierter orangener Turm 3',
          fr: 'Tour orange placée 3',
          ja: '設置した赤塔3',
          cn: '放置 橙塔 3',
          ko: '설치한 주황 기둥 3',
        },
      },
    },
    {
      id: 'AMR Gorai Fire Spread',
      type: 'Ability',
      netRegex: { id: '8511', source: 'Gorai the Uncaged', capture: false },
      suppressSeconds: 30,
      response: Responses.moveAway(),
    },
    // ---------------- Moko the Restless ----------------
    {
      id: 'AMR Moko Kenki Release',
      type: 'StartsUsing',
      netRegex: { id: '85E0', source: 'Moko the Restless', capture: false },
      response: Responses.aoe(),
    },
    {
      id: 'AMR Moko Triple Kasumi-giri Collect',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(mokoVfxMap) },
      run: (data, matches) => {
        const thisAbility = looseMokoVfxMap[matches.count];
        if (thisAbility === undefined)
          return;
        data.tripleKasumiCollect.push(thisAbility);
      },
    },
    {
      id: 'AMR Moko Triple Kasumi-giri 1',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(mokoVfxMap), capture: false },
      condition: (data) => data.tripleKasumiCollect.length === 1,
      durationSeconds: 10,
      alertText: (data, _matches, output) => {
        const [ability] = data.tripleKasumiCollect;
        if (ability === undefined)
          return;
        return output[`${ability}First`]!();
      },
      outputStrings: tripleKasumiFirstOutputStrings,
    },
    {
      id: 'AMR Moko Triple Kasumi-giri 2',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(mokoVfxMap), capture: false },
      condition: (data) => data.tripleKasumiCollect.length === 2,
      infoText: (data, _matches, output) => {
        const ability = data.tripleKasumiCollect[1];
        if (ability === undefined)
          return;
        const text = output[ability]!();
        return output.text!({ text: text });
      },
      outputStrings: {
        text: {
          en: '(${text})',
          de: '(${text})',
          fr: '(${text})',
          ja: '(${text})',
          cn: '(${text})',
          ko: '(${text})',
        },
        ...tripleKasumiFollowupOutputStrings,
      },
    },
    {
      id: 'AMR Moko Triple Kasumi-giri 3',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(mokoVfxMap), capture: false },
      condition: (data) => data.tripleKasumiCollect.length === 3,
      durationSeconds: 10,
      infoText: (data, _matches, output) => {
        const [ability1, ability2, ability3] = data.tripleKasumiCollect;
        if (ability1 === undefined || ability2 === undefined || ability3 === undefined)
          return;
        const text1 = output[`${ability1}First`]!();
        const text2 = output[ability2]!();
        const text3 = output[ability3]!();

        return output.text!({ text1: text1, text2: text2, text3: text3 });
      },
      outputStrings: {
        text: {
          en: '${text1} => ${text2} => ${text3}',
          de: '${text1} => ${text2} => ${text3}',
          fr: '${text1} => ${text2} => ${text3}',
          ja: '${text1} => ${text2} => ${text3}',
          cn: '${text1} => ${text2} => ${text3}',
          ko: '${text1} => ${text2} => ${text3}',
        },
        ...tripleKasumiFirstOutputStrings,
        ...tripleKasumiFollowupOutputStrings,
      },
    },
    {
      id: 'AMR Moko Triple Kasumi-giri Followup',
      type: 'Ability',
      netRegex: { id: tripleKasumiAbilityIds, source: 'Moko the Restless', capture: false },
      suppressSeconds: 1,
      alertText: (data, _matches, output) => {
        // First one has already been called, so ignore it.
        if (data.tripleKasumiCollect.length === 3)
          data.tripleKasumiCollect.shift();
        const ability = data.tripleKasumiCollect.shift();
        if (ability === undefined)
          return;
        return output[ability]!();
      },
      outputStrings: tripleKasumiFollowupOutputStrings,
    },
    {
      id: 'AMR Moko Lateral Slice',
      type: 'StartsUsing',
      netRegex: { id: '85E3', source: 'Moko the Restless' },
      response: Responses.tankBuster(),
    },
    {
      id: 'AMR Moko Scarlet Auspice',
      type: 'StartsUsing',
      netRegex: { id: '85D1', source: 'Moko the Restless', capture: false },
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Sides + Out => Stay Out',
          de: 'Seiten + Raus => Bleib drausen',
          fr: 'Côtés + Extérieur => Restez à l\'extérieur',
          ja: '横へ + 外 => そのまま外',
          cn: '两侧 + 远离 => 待在外面',
          ko: '양 옆 + 밖 => 밖에 있기',
        },
      },
    },
    {
      id: 'AMR Moko Azure Auspice',
      type: 'StartsUsing',
      netRegex: { id: '85D4', source: 'Moko the Restless', capture: false },
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Under => Sides + Out',
          de: 'Unter ihn => Seiten + Geh Raus',
          fr: 'Dessous => Côtés + Extérieur',
          ja: 'ボスの下へ => 横へ + 外',
          cn: '去脚下 => 两侧 + 远离',
          ko: '안 => 양 옆 + 밖',
        },
      },
    },
    {
      id: 'AMR Moko Azure Auspice Followup',
      type: 'Ability',
      netRegex: { id: '85D4', source: 'Moko the Restless', capture: false },
      suppressSeconds: 1,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Sides + Out',
          de: 'Seiten + Raus',
          fr: 'Côtés + Extérieur',
          ja: '横へ + 外',
          cn: '两侧 + 远离',
          ko: '양 옆 + 밖',
        },
      },
    },
    {
      id: 'AMR Moko Fire Line Collect',
      type: 'MapEffect',
      // flags:
      //   00010001 = make lines appear (both blue and red)
      //   00100020 = make lines glow (both blue and red)
      // locations:
      //   2C = N (fire)
      //   2D = NW<->SE (fire)
      //   2E = NE<->SW (fire)
      //   2F = S (fire)
      //   30-33 = blue lines, some order
      netRegex: { flags: '00100020', location: '2[CDEF]' },
      condition: (data, matches) => {
        data.explosionLineCollect.push(matches);
        return data.explosionLineCollect.length === 2;
      },
      durationSeconds: 5,
      alertText: (data, _matches, output) => {
        const isNorth = data.explosionLineCollect.find((x) => x.location === '2F') !== undefined;
        const isSWOrNE = data.explosionLineCollect.find((x) => x.location === '2D') !== undefined;

        if (isNorth)
          return isSWOrNE ? output.dirNE!() : output.dirNW!();
        return isSWOrNE ? output.dirSW!() : output.dirSE!();
      },
      outputStrings: {
        dirNE: Outputs.dirNE,
        dirSE: Outputs.dirSE,
        dirSW: Outputs.dirSW,
        dirNW: Outputs.dirNW,
        unknown: Outputs.unknown,
      },
    },
    {
      id: 'AMR Moko Invocation Collect',
      type: 'GainsEffect',
      // E1A = Vengeful Flame (spread)
      // E1B = Vengeful Pyre (stack)
      netRegex: { effectId: ['E1A', 'E1B'] },
      run: (data, matches) => data.invocationCollect.push(matches),
    },
    {
      id: 'AMR Moko Invocation of Vengeance',
      type: 'GainsEffect',
      netRegex: { effectId: ['E1A', 'E1B'], capture: false },
      delaySeconds: 0.5,
      durationSeconds: 5,
      suppressSeconds: 999999,
      response: (data, _matches, output) => {
        // cactbot-builtin-response

        // TODO: the timing of this is a little bit tough to condense:
        //   t=0.0 these effects
        //   t=2.3 tether appears
        //   t=2.7 explosion lines start glowing
        // Right now we just call everything separately to call it as soon as possible.
        // A more complicated alternative to be to call this here, and then slightly later
        // figure out who should stack with the tether where, since you know if it's a melee stack
        // and the melee has a tether you could tell people "Stack with Tether SE" kind of thing.
        //
        // However, because there's so many calls, we'll drop the "stacks on" part of this.
        return stackSpreadResponse(data, output, data.invocationCollect, 'E1B', 'E1A', true);
      },
    },
    {
      id: 'AMR Moko Invocation of Vengeance Followup',
      type: 'Ability',
      // 85DC = Vengeful Flame
      // 85DD = Vengeful Pyre
      netRegex: { id: ['85DC', '85DD'], capture: false },
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        const mech = data.stackSpreadSecondMechanic;
        if (mech === undefined)
          return;
        delete data.stackSpreadFirstMechanic;
        delete data.stackSpreadSecondMechanic;
        return output[mech]!();
      },
      outputStrings: basicStackSpreadOutputStrings,
    },
    {
      id: 'AMR Moko Iai-giri Cleanup',
      type: 'StartsUsing',
      // 85C2 = Fleeting Iai-giri (from Moko the Restless)
      // 85C8 = Double Iai-giri (from Moko's Shadow)
      netRegex: { id: ['85C2', '85C8'], capture: false },
      // Clean up once so we can collect casts.
      suppressSeconds: 5,
      run: (data) => {
        data.iaigiriTether = [];
        data.iaigiriPurple = [];
        data.iaigiriCasts = [];
        delete data.myAccursedEdge;
        delete data.myIaigiriTether;
        delete data.oniClaw;
      },
    },
    {
      id: 'AMR Moko Iai-giri Tether Collect',
      type: 'Tether',
      netRegex: { id: '0011' },
      run: (data, matches) => {
        data.iaigiriTether.push(matches);
        if (matches.target === data.me)
          data.myIaigiriTether = matches;
      },
    },
    {
      id: 'AMR Moko Iai-giri Purple Marker Collect',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(shadowVfxMap) },
      run: (data, matches) => data.iaigiriPurple.push(matches),
    },
    {
      id: 'AMR Moko Iai-giri Double Iai-giri Collect',
      type: 'StartsUsing',
      netRegex: { id: '85C8', source: 'Moko\'s Shadow' },
      run: (data, matches) => data.iaigiriCasts.push(matches),
    },
    {
      id: 'AMR Moko Iai-giri Accursed Edge Collect',
      type: 'Ability',
      netRegex: { id: '85DA' },
      condition: Conditions.targetIsYou(),
      // You could (but shouldn't) be hit by multiple of these, so just take the last.
      run: (data, matches) => data.myAccursedEdge = matches,
    },
    {
      id: 'AMR Moko Fleeting Iai-giri',
      type: 'Tether',
      netRegex: { id: '0011', capture: false },
      delaySeconds: 0.5,
      durationSeconds: 7,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          backOnYou: {
            en: 'Back Tether on YOU',
            de: 'Zurück-Verbindung auf DIR',
            fr: 'Lien arrière sur VOUS',
            ja: '自分の後ろに線',
            cn: '后方连线点名!',
            ko: '선-뒤쪽 대상자',
          },
          leftOnYou: {
            en: 'Left Tether on YOU',
            de: 'Links-Verbindung auf DIR',
            fr: 'Lien à gauche sur VOUS',
            ja: '自分の左に線',
            cn: '左侧连线点名!',
            ko: '선-왼쪽 대상자',
          },
          frontOnYou: {
            en: 'Front Tether on YOU',
            de: 'Vorne-Verbindung auf DIR',
            fr: 'Lien avant sur VOUS',
            ja: '自分の前に線',
            cn: '前方连线点名!',
            ko: '선-앞쪽 대상자',
          },
          rightOnYou: {
            en: 'Right Tether on YOU',
            de: 'Rechts-Verbindung auf DIR',
            fr: 'Lien à droite sur VOUS',
            ja: '自分の右に線',
            cn: '右侧连线点名!',
            ko: '선-오른쪽 대상자',
          },
          backOnPlayer: {
            en: 'Back Tether on ${player}',
            de: 'Zurück-Verbindung auf ${player}',
            fr: 'Lien arrière sur ${player}',
            ja: '後ろの線: ${player}',
            cn: '后方连线点 ${player}',
            ko: '선-뒤쪽 ${player}',
          },
          leftOnPlayer: {
            en: 'Left Tether on ${player}',
            de: 'Links-Verbindung auf ${player}',
            fr: 'Lien à gauche sur ${player}',
            ja: '左の線: ${player}',
            cn: '左侧连线点 ${player}',
            ko: '선-왼쪽 ${player}',
          },
          frontOnPlayer: {
            en: 'Front Tether on ${player}',
            de: 'Vorne-Verbindung auf ${player}',
            fr: 'Lien avant sur ${player}',
            ja: '前の線: ${player}',
            cn: '前方连线点 ${player}',
            ko: '선-앞쪽 ${player}',
          },
          rightOnPlayer: {
            en: 'Right Tether on ${player}',
            de: 'Rechts-Verbindung auf ${player}',
            fr: 'Lien à droite sur ${player}',
            ja: '右の線: ${player}',
            cn: '右侧连线点 ${player}',
            ko: '선-오른쪽 ${player}',
          },
        };

        if (data.iaigiriTether.length !== 1 || data.iaigiriPurple.length !== 1)
          return;

        const [tether] = data.iaigiriTether;
        const [marker] = data.iaigiriPurple;
        if (tether === undefined || marker === undefined)
          return;

        const thisAbility = looseShadowVfxMap[marker.count];
        if (thisAbility === undefined)
          return;

        const player = tether.target;
        if (player === data.me) {
          const outputKey = `${thisAbility}OnYou`;
          return { alarmText: output[outputKey]!() };
        }

        const outputKey = `${thisAbility}OnPlayer`;
        return { infoText: output[outputKey]!({ player: data.party.member(player) }) };
      },
    },
    {
      id: 'AMR Moko Double Shadow Kasumi-giri Initial',
      type: 'Tether',
      netRegex: { id: '0011', capture: false },
      condition: (data) => !data.seenSoldiersOfDeath,
      delaySeconds: 0.5,
      durationSeconds: 4,
      suppressSeconds: 1,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          backOnYou: {
            en: 'Back Tether (${partners})',
            de: 'Zurück-Verbindung (${partners}))',
            fr: 'Lien arrière (${partners})',
            ja: '後ろの線 (${partners})',
            cn: '后方连线 (和 ${partners})',
            ko: '선-뒤쪽 (${partners})',
          },
          // These are probably impossible.
          leftOnYou: {
            en: 'Left Tether (${partners})',
            de: 'Links-Verbindung (${partners})',
            fr: 'Lien à gauche (${partners})',
            ja: '左の線 (${partners})',
            cn: '左侧连线 (和 ${partners})',
            ko: '선-왼쪽 (${partners})',
          },
          frontOnYou: {
            en: 'Front Tether (${partners})',
            de: 'Vorne-Verbindung (${partners})',
            fr: 'Lien avant (${partners})',
            ja: '前の線 (${partners})',
            cn: '前方连线 (和 ${partners})',
            ko: '선-앞쪽 (${partners})',
          },
          rightOnYou: {
            en: 'Right Tether (${partners})',
            de: 'Rechts-Verbindung (${partners})',
            fr: 'Lien à droite (${partners})',
            ja: '右の線 (${partners})',
            cn: '右侧连线 (和 ${partners})',
            ko: '선-오른쪽 (${partners})',
          },
          unmarked: {
            en: 'Unmarked (${partners})',
            de: 'Unmarkiert (${partners})',
            fr: 'Non-marqué (${partners})',
            ja: '線なし (${partners})',
            cn: '无点名 (和 ${partners})',
            ko: '무징 (${partners})',
          },
          melee: {
            en: 'melees together',
            de: 'Nahkämpfer zusammen',
            fr: 'Mêlées ensemble',
            ja: '近接ペア',
            cn: '近战同组',
            ko: '근딜끼리',
          },
          role: {
            en: 'roles together',
            de: 'Rollen zusammen',
            fr: 'Rôles ensemble',
            ja: 'ロールペア',
            cn: '职能分组',
            ko: '역할군끼리',
          },
          partner: {
            en: 'partners together',
            de: 'Partner zusammen',
            fr: 'Partenaires ensemble',
            ja: 'ペア',
            cn: '搭档分组',
            ko: '파트너끼리',
          },
          unknown: Outputs.unknown,
        };

        if (data.iaigiriTether.length !== 2 || data.iaigiriPurple.length !== 2)
          return;

        const [tether1, tether2] = data.iaigiriTether;
        const [marker1, marker2] = data.iaigiriPurple;
        if (
          tether1 === undefined || tether2 === undefined || marker1 === undefined ||
          marker2 === undefined
        )
          return;

        const player1 = tether1.target;
        const player2 = tether2.target;

        const stackType = findStackPartners(data, player1, player2);
        const stackStr = output[stackType]!();

        if (data.myIaigiriTether === undefined)
          return { alertText: output.unmarked!({ partners: stackStr }) };

        const myMarker = marker1.sourceId === data.myIaigiriTether.sourceId ? marker1 : marker2;

        const thisAbility = looseShadowVfxMap[myMarker.count];
        if (thisAbility === undefined)
          return;

        const outputKey = `${thisAbility}OnYou`;
        return { alarmText: output[outputKey]!({ partners: stackStr }) };
      },
    },
    {
      id: 'AMR Moko Oni Claw',
      type: 'GainsEffect',
      // This happens ~2.3 seconds prior to the Clearout/Far Edge/Near Edge cast starting,
      // and is the first time these adds appear in the log other than 261 change lines
      // which reposition these adds immediately prior to them gaining this effect.
      netRegex: { effectId: '808', count: '257' },
      suppressSeconds: 1,
      promise: async (data, matches) => {
        data.combatantData = [];
        data.combatantData = (await callOverlayHandler({
          call: 'getCombatants',
          ids: [parseInt(matches.targetId, 16)],
        })).combatants;
      },
      // This is infoText to not conflict with the Unmarked/Tether calls.
      // We could combine this with the Near Far Edge call, but it seemed better to say it sooner.
      infoText: (data, _matches, output) => {
        const [combatant] = data.combatantData;
        if (combatant === undefined || data.combatantData.length !== 1)
          return;

        const dir = Directions.xyTo4DirNum(
          combatant.PosX,
          combatant.PosY,
          mokoCenterX,
          mokoCenterY,
        );
        data.oniClaw = (dir === 1 || dir === 3) ? 'northSouth' : 'eastWest';
        if (data.oniClaw === 'northSouth')
          return output.northSouth!();
        return output.eastWest!();
      },
      outputStrings: {
        northSouth: {
          en: 'North/South',
          de: 'Norden/Süden',
          fr: 'Nord/Sud',
          ja: '北・南',
          cn: '上/下',
          ko: '북쪽/남쪽',
        },
        eastWest: {
          en: 'East/West',
          de: 'Osten/Westen',
          fr: 'Est/Ouest',
          ja: '東・西',
          cn: '左/右',
          ko: '동쪽/서쪽',
        },
      },
    },
    {
      id: 'AMR Moko Near Far Edge',
      type: 'StartsUsing',
      // 85D8 = Far Edge
      // 85D9 = Near Edge
      netRegex: { id: ['85D8', '85D9'], source: 'Moko the Restless' },
      alertText: (data, matches, output) => {
        const isFarEdge = matches.id === '85D8';
        if (data.myIaigiriTether === undefined)
          return isFarEdge ? output.baitFar!() : output.baitNear!();
        return isFarEdge ? output.tetherNear!() : output.tetherFar!();
      },
      outputStrings: {
        baitNear: {
          en: 'Bait Near (Tether Far)',
          de: 'Nah ködern (Verbindung Fern)',
          fr: 'Attirez proche (Lien éloigné)',
          ja: 'ニア (線ファー)',
          cn: '靠近引导 (连线远离)',
          ko: '유도 가까이 (선 멀리)',
        },
        baitFar: {
          en: 'Bait Far (Tether Near)',
          de: 'Fern ködern (Verbindung Nah)',
          fr: 'Attirez loin (Lien proche)',
          ja: 'ファー (線ニア)',
          cn: '远离引导 (连线靠近)',
          ko: '멀리 유도 (선 가까이)',
        },
        tetherNear: {
          en: 'Tether Near (Bait Far)',
          de: 'Verbindung Nahe (Fern ködern)',
          fr: 'Lien proche (Attirez loin)',
          ja: '線ニア (誘導ファー)',
          cn: '靠近拉线 (引导远离)',
          ko: '선 가까이 (유도 가까이)',
        },
        tetherFar: {
          en: 'Tether Far (Bait Near)',
          de: 'Verbindung Fern (Nahe ködern)',
          fr: 'Lien éloigné (Attirez proche)',
          ja: '線ファー (誘導ニア)',
          cn: '远离拉线 (引导靠近)',
          ko: '선 멀리 (유도 멀리)',
        },
      },
    },
    {
      id: 'AMR Moko Double Shadow Kasumi-giri Second Mark',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(shadowVfxMap) },
      condition: (data, matches) => {
        if (data.seenSoldiersOfDeath)
          return false;

        // Ignore the first set of marks, which get called with the tether.
        if (data.iaigiriPurple.length <= 2)
          return false;

        // For the first two Double-Iaigiris before Soldiers of Death,
        // if this is the 4th mark (i.e. the 2nd in the 2nd set) and they are both the same,
        // then we can call that mark for everyone because it doesn't matter where they are.
        const third = data.iaigiriPurple[2]?.count;
        const fourth = data.iaigiriPurple[3]?.count;
        if (third === fourth && third !== undefined && !data.seenSoldiersOfDeath)
          return true;

        // See if the current player is attached to a tether that
        // is attached to the mob gaining this effect.
        // Since we aren't sure where the baiters are we can't really tell them anything.
        return data.myIaigiriTether?.sourceId === matches.targetId;
      },
      // Don't collide with Near Far Edge, which is more important.
      delaySeconds: 3,
      durationSeconds: 5.5,
      suppressSeconds: 5,
      infoText: (data, matches, output) => {
        const third = data.iaigiriPurple[2]?.count;
        const fourth = data.iaigiriPurple[3]?.count;
        if (third === fourth && third !== undefined && !data.seenSoldiersOfDeath) {
          const thisAbility = looseShadowVfxMap[third];
          if (thisAbility === undefined)
            return;
          return output[thisAbility]!();
        }

        const thisAbility = looseShadowVfxMap[matches.count];
        if (thisAbility === undefined)
          return;
        return output[thisAbility]!();
      },
      outputStrings: {
        // This is probably not possible.
        back: {
          en: '(then stay)',
          de: '(bleib stehen)',
          fr: '(puis restez)',
          ja: '(後はそのまま)',
          cn: '(稍后 停)',
          ko: '(이후 그대로)',
        },
        left: {
          en: '(then left)',
          de: '(dann links)',
          fr: '(puis à gauche)',
          ja: '(後は左)',
          cn: '(稍后 去左侧)',
          ko: '(이후 왼쪽)',
        },
        front: {
          en: '(then through)',
          de: '(dann durchgehen)',
          fr: '(puis devant)',
          ja: '(後はまたいで移動)',
          cn: '(稍后 穿)',
          ko: '(이후 가로지르기)',
        },
        right: {
          en: '(then right)',
          de: '(dann rechts)',
          fr: '(puis à droite)',
          ja: '(後は右)',
          cn: '(稍后 去右侧)',
          ko: '(이후 오른쪽)',
        },
      },
    },
    {
      id: 'AMR Moko Shadow Kasumi-giri Back Tether',
      type: 'Ability',
      netRegex: { id: '85C9', source: 'Moko\'s Shadow' },
      condition: (data, matches) => data.myIaigiriTether?.sourceId === matches.sourceId,
      durationSeconds: 2,
      // Maybe you have two tethers, although it probably won't go well.
      suppressSeconds: 1,
      alertText: (_data, _matches, output) => output.back!(),
      outputStrings: {
        // This is a reminder to make sure to move after the clone jumps to you.
        // TODO: should see this say Back => Right or something?
        back: Outputs.back,
      },
    },
    {
      id: 'AMR Moko Shadow Kasumi-giri Followup',
      type: 'Ability',
      netRegex: { id: '85CA', source: 'Moko\'s Shadow' },
      condition: (data, matches) => {
        // Reject anybody not tethered by this add or not on the same side.
        if (data.myIaigiriTether === undefined) {
          if (data.oniClaw === 'northSouth') {
            const myYStr = data.myAccursedEdge?.targetY;
            if (myYStr === undefined)
              return false;

            const thisY = parseFloat(matches.y);
            const myY = parseFloat(myYStr);
            if (
              myY < mokoCenterY && thisY > mokoCenterY || myY > mokoCenterY && thisY < mokoCenterY
            )
              return false;
          } else if (data.oniClaw === 'eastWest') {
            const myXStr = data.myAccursedEdge?.targetX;
            if (myXStr === undefined)
              return false;

            const thisX = parseFloat(matches.x);
            const myX = parseFloat(myXStr);
            if (
              myX < mokoCenterX && thisX > mokoCenterX || myX > mokoCenterX && thisX < mokoCenterX
            )
              return false;
          } else if (data.oniClaw === undefined) {
            // missing data.oniClaw somehow??
            return false;
          }
        } else if (matches.sourceId !== data.myIaigiriTether.sourceId) {
          return false;
        }

        return true;
      },
      suppressSeconds: 1,
      alertText: (data, matches, output) => {
        // Find the second marker for this add.
        const marker = [...data.iaigiriPurple].reverse().find((x) => {
          return x.targetId === matches.sourceId;
        });
        if (marker === undefined)
          return;

        const thisAbility = looseShadowVfxMap[marker.count];
        if (thisAbility === undefined)
          return;
        return output[thisAbility]!();
      },
      outputStrings: {
        // This probably can't happen.
        back: {
          en: 'Stay',
          de: 'Bleib stehen',
          fr: 'Restez',
          ja: 'そのまま',
          cn: '停',
          ko: '그대로',
        },
        left: Outputs.left,
        front: {
          en: 'Through',
          de: 'Lauf durch',
          fr: 'À travers',
          ja: 'またいで',
          cn: '穿',
          ko: '가로지르기',
        },
        right: Outputs.right,
      },
    },
    {
      id: 'AMR Moko Soldiers of Death',
      type: 'StartsUsing',
      netRegex: { id: '8593', source: 'Moko the Restless', capture: false },
      run: (data, _matches) => data.seenSoldiersOfDeath = true,
    },
    {
      id: 'AMR Moko Soldiers of Death Blue Add',
      type: 'GainsEffect',
      // The red soldiers get 1E8 effects, and the blue add gets 5E.
      netRegex: { effectId: '808', count: '5E' },
      promise: async (data, matches) => {
        data.combatantData = [];
        data.combatantData = (await callOverlayHandler({
          call: 'getCombatants',
          ids: [parseInt(matches.targetId, 16)],
        })).combatants;
      },
      alertText: (data, _matches, output) => {
        const [combatant] = data.combatantData;
        if (combatant === undefined || data.combatantData.length !== 1)
          return;

        const x = combatant.PosX - mokoCenterX;
        const y = combatant.PosY - mokoCenterY;

        // This add is off the edge (far) and then along that edge (less far).
        // We need to look at the "less far" direction and go opposite.
        // Additionally, if the add is north/south it will shoot "short"
        // and if it is east/west then it will shoot "long".
        const isShootingLongFromEastWest = Math.abs(x) > Math.abs(y);
        const isEast = x > 0;
        const isNorth = y < 0;
        if (isShootingLongFromEastWest) {
          if (isNorth)
            return isEast ? output.dirSE!() : output.dirSW!();
          return isEast ? output.dirNE!() : output.dirNW!();
        }

        if (isEast)
          return isNorth ? output.dirSW!() : output.dirNW!();
        return isNorth ? output.dirSE!() : output.dirNE!();
      },
      outputStrings: {
        dirNE: Outputs.dirNE,
        dirSE: Outputs.dirSE,
        dirSW: Outputs.dirSW,
        dirNW: Outputs.dirNW,
      },
    },
    {
      id: 'AMR Moko Soldiers of Death Shadow Kasumi-giri Tether',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: Object.keys(shadowVfxMap), capture: false },
      // Ignore the first set of marks, which get called with the tether.
      condition: (data) => data.iaigiriPurple.length > 4,
      // Wait to collect or call immediately if we have everything.
      delaySeconds: (data) => data.iaigiriPurple.length === 8 ? 0 : 0.5,
      durationSeconds: 5,
      suppressSeconds: 5,
      alertText: (data, _matches, output) => {
        const myTether = data.myIaigiriTether;
        if (myTether === undefined)
          return;

        // Find the second marker for this add.
        const marker = [...data.iaigiriPurple].reverse().find((x) => {
          return x.targetId === myTether.sourceId;
        });
        if (marker === undefined)
          return;

        const thisAbility = looseShadowVfxMap[marker.count];
        if (thisAbility !== 'left' && thisAbility !== 'right')
          return;

        // Find the matching marker for your marker.
        const matchingMarkers = data.iaigiriPurple.filter((x) => {
          return x.count === marker.count && x.targetId !== marker.targetId;
        });
        // Make sure there's only one matching symbol, just in case.
        const [partnerMarker] = matchingMarkers;
        if (partnerMarker === undefined || matchingMarkers.length !== 1)
          return;

        // Find the matching tether for this matching marker.
        const partnerTether = data.iaigiriTether.find((x) => {
          return x.sourceId === partnerMarker.targetId;
        });
        if (partnerTether === undefined)
          return;

        // It's better uptime for melee if the melee stick together if they can,
        // however it should always be safe to stick roles together here and so
        // for consistency, ignore the "melee first" option.
        const flexPartner = partnerTether.target;
        const stackType = findStackPartners(data, data.me, flexPartner, 'rolesPartners');
        const stackStr = output[stackType]!();

        if (thisAbility === 'left')
          return output.left!({ partners: stackStr });
        return output.right!({ partners: stackStr });
      },
      outputStrings: {
        left: {
          en: 'Left Tether (${partners})',
          de: 'Linke Verbindung (${partners})',
          fr: 'Lien à gauche (${partners})',
          ja: '左線 (${partners})',
          cn: '左侧连线 (${partners})',
          ko: '왼쪽 선 (${partners})',
        },
        right: {
          en: 'Right Tether (${partners})',
          de: 'Rechte Verbindung (${partners})',
          fr: 'Lien à droite (${partners})',
          ja: '右線 (${partners})',
          cn: '右侧连线 (${partners})',
          ko: '오른쪽 선 (${partners})',
        },
        role: {
          en: 'roles together',
          de: 'Rollen zusammen',
          fr: 'Rôles ensemble',
          ja: 'ロールペア',
          cn: '职能集合',
          ko: '역할군끼리',
        },
        partner: {
          en: 'partners together',
          de: 'Partner zusammen',
          fr: 'Partenaires ensemble',
          ja: 'ペア',
          cn: '和搭档集合',
          ko: '파트너끼리',
        },
        unknown: Outputs.unknown,
      },
    },
  ],
  timelineReplace: [
    {
      'locale': 'en',
      'replaceText': {
        'Eye of the Thunder Vortex/Vortex of the Thunder Eye': 'Thunder Eye/Vortex',
        'Far Edge/Near Edge': 'Far/Near Edge',
        'Great Ball of Fire/Greater Ball of Fire': 'Greater/Great Ball of Fire',
        'Greater Ball of Fire/Great Ball of Fire': 'Great/Greater Ball of Fire',
        'Near Edge/Far Edge': 'Near/Far Edge',
        'Unnatural Ailment/Unnatural Force': 'Unnatural Ailment/Force',
        'Unnatural Force/Unnatural Ailment': 'Unnatural Force/Ailment',
        'Vengeful Flame/Vengeful Pyre': 'Vengeful Flame/Pyre',
        'Vortex of the Thunder Eye/Eye of the Thunder Vortex': 'Thunder Vortex/Eye',
      },
    },
    {
      'locale': 'de',
      'replaceSync': {
        'Ashigaru Kyuhei': 'Ashigaru Kyuhei',
        'Ball of Levin': 'Elektrosphäre',
        'Devilish Thrall': 'hörig(?:e|er|es|en) Shiki',
        'Gorai the Uncaged': 'Gorai (?:der|die|das) Entfesselt(?:e|er|es|en)',
        'Moko the Restless': 'Moko (?:der|die|das) Rastlos(?:e|er|es|en)',
        'Moko\'s Shadow': 'Phantom-Moko',
        'Oni\'s Claw': 'Oni-Klaue',
        'Shishio': 'Shishio',
        'Shishu Fuko': 'Shishu-Fuko',
        'Shishu Furutsubaki': 'Shishu-Furutsubaki',
        'Shishu Kotengu': 'Shishu-Kotengu',
        'Shishu Onmitsugashira': 'Shishu-Onmitsugarashi',
        'Shishu Raiko': 'Shishu-Raiko',
        'Shishu Yuki': 'Shishu-Yuki',
        'The Trial Of Benevolence': 'Probe der Güte',
        'The Trial Of Responsibility': 'Probe der Pflicht',
        'The Trial Of Wisdom': 'Probe der Weisheit',
      },
      'replaceText': {
        '\\(circles\\)': '(Kreise)',
        '\\(lines\\)': '(Linien)',
        'Azure Auspice': 'Azurblauer Kenki-Fokus',
        'Boundless Azure': 'Grenzenloses Azurblau',
        'Boundless Scarlet': 'Grenzenloses Scharlachrot',
        'Brazen Ballad': 'Biwa-Weise',
        '(?<!Levin)Burst': 'Explosion',
        'Clearout': 'Ausräumung',
        'Cloud to Ground': 'Sturmkonzentration',
        'Double Iai-giri': 'Doppeltes Iai-giri',
        'Enkyo': 'Enkyo',
        'Explosion': 'Explosion',
        'Eye of the Thunder Vortex': 'Auge des Sturmwirbels',
        'Falling Rock': 'Steinschlag',
        'Far Edge': 'Fernschneidung',
        'Fighting Spirits': 'Kräftigender Schluck',
        'Fire Spread': 'Brandstiftung',
        'Flame and Sulphur': 'Flamme und Schwefel',
        'Fleeting Iai-giri': 'Leichtfüßiges Iai-giri',
        'Flickering Flame': 'Flackernde Flamme',
        'Flintlock': 'Steinschloss',
        'Great Ball of Fire': 'Großer Feuerball',
        'Greater Ball of Fire': 'Größerer Feuerball',
        'Haunting Cry': 'Klagender Schrei',
        'Humble Hammer': 'Entehrender Hammer',
        'Impure Purgation': 'Flammenwind',
        'Invocation of Vengeance': 'Ruf nach Vergeltung',
        'Iron Rain': 'Eisenregen',
        'Iron Storm': 'Eisensturm',
        'Kenki Release': 'Kenki-Entfesselung',
        'Lateral Slice': 'Lateralschlitzer',
        'Left Swipe': 'Linker Feger',
        'Levinburst': 'Blitzgang',
        'Malformed Prayer': 'Unheil des Perlenkranzes',
        'Malformed Reincarnation': 'Unheilvolle Verwandlung',
        'Moonless Night': 'Mondlose Nacht',
        'Near Edge': 'Nahschneidung',
        'Noble Pursuit': 'Reißzahn des Löwen',
        'Pointed Purgation': 'Gerichteter Flammenwind',
        'Right Swipe': 'Rechter Feger',
        'Rousing Reincarnation': 'Fluch der Verwandlung',
        'Scarlet Auspice': 'Scharlachroter Kenki-Fokus',
        'Seal of Scurrying Sparks': 'Siegel des Funkenflugs',
        'Shadow Kasumi-giri': 'Obskures Kasumi-giri',
        'Shadow-twin': 'Schattenzwilling',
        'Shock': 'Entladung',
        'Slither': 'Schlängeln',
        'Smokeater': 'Dunstfresser',
        'Soldiers of Death': 'Soldaten des Todes',
        'Splitting Cry': 'Schrecklicher Schrei',
        'Stormcloud Summons': 'Elektrizitätsgenerierung',
        'Stygian Aura': 'Schwarze Aura',
        '(?<!Eye of the )Thunder Vortex': 'Sturmwirbel',
        'Thundercall': 'Donnerruf',
        'Torching Torment': 'Höllische Hitze',
        'Triple Kasumi-giri': 'Dreifaches Kasumi-giri',
        'Unenlightenment': 'Glühende Geißel',
        'Unnatural Ailment': 'Unnatürliches Leiden',
        'Unnatural Force': 'Unnatürliche Macht',
        'Unnatural Wail': 'Unnatürliches Heulen',
        'Upwell': 'Strömung',
        'Vengeful Flame': 'Vergeltende Flamme',
        'Vengeful Pyre': 'Vergeltendes Feuer',
        'Vengeful Souls': 'Rachsüchtige Seelen',
        'Vermilion Aura': 'Rote Aura',
        'Vortex of the Thunder Eye': 'Wirbel des Sturmauges',
        'Worldly Pursuit': 'Schmerzschlag der Springmaus',
      },
    },
    {
      'locale': 'fr',
      'replaceSync': {
        'Ashigaru Kyuhei': 'ashigaru kyûhei',
        'Ball of Levin': 'orbe de foudre',
        'Devilish Thrall': 'ilote malicieux',
        'Gorai the Uncaged': 'Gôrai le fureteur',
        'Moko the Restless': 'Môko le tourmenté',
        'Moko\'s Shadow': 'spectre de Môko',
        'Oni\'s Claw': 'griffe d\'oni',
        'Shishio': 'Shishiô',
        'Shishu Fuko': 'fûkô de Shishû',
        'Shishu Furutsubaki': 'furutsubaki de Shishû',
        'Shishu Kotengu': 'kotengu de Shishû',
        'Shishu Onmitsugashira': 'onmitsugashira de Shishû',
        'Shishu Raiko': 'raikô de Shishû',
        'Shishu Yuki': 'yûki de Shishû',
        'The Trial Of Benevolence': 'Épreuve de la Prospérité',
        'The Trial Of Responsibility': 'Épreuve de la Longévité',
        'The Trial Of Wisdom': 'Épreuve de la Connaissance',
      },
      'replaceText': {
        '\\(circles\\)': '(Cercles)',
        '\\(lines\\)': '(Lignes)',
        'Azure Auspice': 'Auspice azuré',
        'Boundless Azure': 'Lueur azurée',
        'Boundless Scarlet': 'Lueur écarlate',
        'Brazen Ballad': 'Ballade cuivrée',
        '(?<!Levin)Burst': 'Explosion',
        'Clearout': 'Fauchage',
        'Cloud to Ground': 'Attaque fulminante',
        'Double Iai-giri': 'Iai-giri double',
        'Enkyo': 'Enkyô',
        'Explosion': 'Explosion',
        'Eye of the Thunder Vortex': 'Œil du vortex de foudre',
        'Falling Rock': 'Chute de pierre',
        'Far Edge': 'Visée lointaine',
        'Fighting Spirits': 'Esprits spiritueux',
        'Fire Spread': 'Nappe de feu',
        'Flame and Sulphur': 'Soufre enflammé',
        'Fleeting Iai-giri': 'Iai-giri fugace',
        'Flickering Flame': 'Flamme vacillante',
        'Flintlock': 'Tir d\'artillerie',
        'Great Ball of Fire': 'Grande boule de feu',
        'Greater Ball of Fire': 'Grande sphère de feu',
        'Haunting Cry': 'Cri de tourmente',
        'Humble Hammer': 'Marteau d\'humilité',
        'Impure Purgation': 'Purgation impure',
        'Invocation of Vengeance': 'Invocation vengeresse',
        'Iron Rain': 'Pluie de fer',
        'Iron Storm': 'Orage de fer',
        'Kenki Release': 'Décharge Kenki',
        'Lateral Slice': 'Taillade latérale',
        'Left Swipe': 'Tranchage gauche',
        'Levinburst': 'Éclat de foudre',
        'Malformed Prayer': 'Prière difforme',
        'Malformed Reincarnation': 'Sceau de réincarnation difforme',
        'Moonless Night': 'Nuit noire',
        'Near Edge': 'Visée proche',
        'Noble Pursuit': 'Noble ambition',
        'Pointed Purgation': 'Purgation pointée',
        'Right Swipe': 'Tranchage droit',
        'Rousing Reincarnation': 'Réincarnation vibrante',
        'Scarlet Auspice': 'Auspice écarlate',
        'Seal of Scurrying Sparks': 'Sceau des feux follets',
        'Shadow Kasumi-giri': 'Kasumi-giri spectral',
        'Shadow-twin': 'Ombre jumelle',
        'Shock': 'Décharge électrostatique',
        'Slither': 'Serpentin',
        'Smokeater': 'Dévoreur de brouillard',
        'Soldiers of Death': 'Guerriers de la mort',
        'Splitting Cry': 'Cri d\'horreur',
        'Stormcloud Summons': 'Nuage d\'orage',
        'Stygian Aura': 'Aura stygienne',
        '(?<!Eye of the )Thunder Vortex': 'Spirale de foudre',
        'Thundercall': 'Drain fulminant',
        'Torching Torment': 'Brasier de tourments',
        'Triple Kasumi-giri': 'Kasumi-giri triple',
        'Unenlightenment': 'Sommeil spirituel',
        'Unnatural Ailment': 'Affection contre nature',
        'Unnatural Force': 'Force contre nature',
        'Unnatural Wail': 'Hurlement contre nature',
        'Upwell': 'Torrent violent',
        'Vengeful Flame': 'Flamme vengeresse',
        'Vengeful Pyre': 'Bûcher vengeur',
        'Vengeful Souls': 'Âmes vengeresses',
        'Vermilion Aura': 'Aura vermillon',
        'Vortex of the Thunder Eye': 'Vortex de l\'œil de foudre',
        'Worldly Pursuit': 'Matérialisme',
      },
    },
    {
      'locale': 'ja',
      'replaceSync': {
        'Ashigaru Kyuhei': '足軽弓兵',
        'Ball of Levin': '雷球',
        'Devilish Thrall': '惑わされた屍鬼',
        'Gorai the Uncaged': '鉄鼠ゴウライ',
        'Moko the Restless': '怨霊モウコ',
        'Moko\'s Shadow': 'モウコの幻影',
        'Oni\'s Claw': '鬼腕',
        'Shishio': '獅子王',
        'Shishu Fuko': 'シシュウ・フウコウ',
        'Shishu Furutsubaki': 'シシュウ・フルツバキ',
        'Shishu Kotengu': 'シシュウ・コテング',
        'Shishu Onmitsugashira': 'シシュウ・オンミツガシラ',
        'Shishu Raiko': 'シシュウ・ライコウ',
        'Shishu Yuki': 'シシュウ・ユウキ',
        'The Trial Of Benevolence': '福徳の試練',
        'The Trial Of Responsibility': '寿徳の試練',
        'The Trial Of Wisdom': '智徳の試練',
      },
      'replaceText': {
        'Azure Auspice': '青帝剣気',
        'Boundless Azure': '青帝空閃刃',
        'Boundless Scarlet': '赤帝空閃刃',
        'Brazen Ballad': '琵琶の旋律',
        '(?<!Levin)Burst': '爆発',
        'Clearout': 'なぎ払い',
        'Cloud to Ground': '襲雷',
        'Double Iai-giri': '俊足居合二段',
        'Enkyo': '猿叫',
        'Explosion': '爆発',
        'Eye of the Thunder Vortex': '渦雷の連舞：円輪',
        'Falling Rock': '落石',
        'Far Edge': '遠間当て',
        'Fighting Spirits': '般若湯',
        'Fire Spread': '放火',
        'Flame and Sulphur': '岩火招来',
        'Fleeting Iai-giri': '俊足居合斬り',
        'Flickering Flame': '怪火招来',
        'Flintlock': '火砲',
        'Great Ball of Fire': '火球',
        'Greater Ball of Fire': '重火球',
        'Haunting Cry': '不気味な鳴声',
        'Humble Hammer': '打ち出の小槌',
        'Impure Purgation': '炎流',
        'Invocation of Vengeance': '怨呪の祈請',
        'Iron Rain': '矢の雨',
        'Iron Storm': '矢の嵐',
        'Kenki Release': '剣気解放',
        'Lateral Slice': '胴薙ぎ',
        'Left Swipe': '左爪薙ぎ払い',
        'Levinburst': '発雷',
        'Malformed Prayer': '呪珠印',
        'Malformed Reincarnation': '変現呪珠の印',
        'Moonless Night': '闇夜斬り',
        'Near Edge': '近間当て',
        'Noble Pursuit': '獅子王牙',
        'Pointed Purgation': '指向炎流',
        'Right Swipe': '右爪薙ぎ払い',
        'Rousing Reincarnation': '変現の呪い',
        'Scarlet Auspice': '赤帝剣気',
        'Seal of Scurrying Sparks': '乱火の印',
        'Shadow Kasumi-giri': '幻影霞斬り',
        'Shadow-twin': '幻影呼び',
        'Shock': '放電',
        'Slither': '蛇尾薙ぎ',
        'Smokeater': '霞喰い',
        'Soldiers of Death': '屍兵呼び',
        'Splitting Cry': '霊鳴砲',
        'Stormcloud Summons': '雷雲生成',
        'Stygian Aura': '黒妖弾',
        '(?<!Eye of the )Thunder Vortex': '輪転渦雷',
        'Thundercall': '招雷',
        'Torching Torment': '煩熱',
        'Triple Kasumi-giri': '霞三段',
        'Unenlightenment': '煩悩熾盛',
        'Unnatural Ailment': '妖撃',
        'Unnatural Force': '重妖撃',
        'Unnatural Wail': '不気味な呪声',
        'Upwell': '水流',
        'Vengeful Flame': '怨呪の火',
        'Vengeful Pyre': '怨呪の重火',
        'Vengeful Souls': '黒赤招魂',
        'Vermilion Aura': '赤妖弾',
        'Vortex of the Thunder Eye': '渦雷の連舞：輪円',
        'Worldly Pursuit': '跳鼠痛撃',
      },
    },
    {
      'locale': 'cn',
      'replaceSync': {
        'Ashigaru Kyuhei': '足轻弓兵',
        'Ball of Levin': '闪电球',
        'Devilish Thrall': '被迷惑的尸鬼',
        'Gorai the Uncaged': '铁鼠豪雷',
        'Moko the Restless': '怨灵猛虎',
        'Moko\'s Shadow': '猛虎的幻影',
        'Oni\'s Claw': '鬼腕',
        'Shishio': '狮子王',
        'Shishu Fuko': '紫州风犼',
        'Shishu Furutsubaki': '紫州古椿精',
        'Shishu Kotengu': '紫州小天狗',
        'Shishu Onmitsugashira': '紫州隐密头领',
        'Shishu Raiko': '紫州雷犼',
        'Shishu Yuki': '紫州幽鬼',
        'The Trial Of Benevolence': '福德的试炼',
        'The Trial Of Responsibility': '寿德的试炼',
        'The Trial Of Wisdom': '智德的试炼',
      },
      'replaceText': {
        '\\(circles\\)': '(圆圈)',
        '\\(lines\\)': '(直线)',
        'Azure Auspice': '青帝剑气',
        'Boundless Azure': '青帝空闪刃',
        'Boundless Scarlet': '赤帝空闪刃',
        'Brazen Ballad': '琵琶的旋律',
        '(?<!Levin)Burst': '爆炸',
        'Clearout': '横扫',
        'Cloud to Ground': '袭雷',
        'Double Iai-giri': '二段迅步居合斩',
        'Enkyo': '猿啼',
        'Explosion': '爆炸',
        'Eye of the Thunder Vortex': '涡雷连舞之圆环',
        'Falling Rock': '落石',
        'Far Edge': '远刃击',
        'Fighting Spirits': '般若汤',
        'Fire Spread': '喷火',
        'Flame and Sulphur': '岩火招来',
        'Fleeting Iai-giri': '迅步居合斩',
        'Flickering Flame': '怪火招来',
        'Flintlock': '火炮',
        'Great Ball of Fire': '火球',
        'Greater Ball of Fire': '重火球',
        'Haunting Cry': '诡异的叫声',
        'Humble Hammer': '万宝槌',
        'Impure Purgation': '炎流',
        'Invocation of Vengeance': '怨咒的祈请',
        'Iron Rain': '钢铁箭雨',
        'Iron Storm': '箭雨风暴',
        'Kenki Release': '剑气解放',
        'Lateral Slice': '横斩中段',
        'Left Swipe': '左爪横扫',
        'Levinburst': '放雷',
        'Malformed Prayer': '咒珠印',
        'Malformed Reincarnation': '变见咒珠之印',
        'Moonless Night': '暗夜斩',
        'Near Edge': '近刃击',
        'Noble Pursuit': '狮子王牙',
        'Pointed Purgation': '指向炎流',
        'Right Swipe': '右爪横扫',
        'Rousing Reincarnation': '变见的诅咒',
        'Scarlet Auspice': '赤帝剑气',
        'Seal of Scurrying Sparks': '乱火之印',
        'Shadow Kasumi-giri': '幻影霞斩',
        'Shadow-twin': '召唤幻影',
        'Shock': '放电',
        'Slither': '蛇尾抽击',
        'Smokeater': '噬霞',
        'Soldiers of Death': '召唤阴兵',
        'Splitting Cry': '灵鸣炮',
        'Stormcloud Summons': '生成雷暴云',
        'Stygian Aura': '黑妖弹',
        '(?<!Eye of the )Thunder Vortex': '回环涡雷',
        'Thundercall': '招雷',
        'Torching Torment': '烦热',
        'Triple Kasumi-giri': '三段霞斩',
        'Unenlightenment': '烦恼炽盛',
        'Unnatural Ailment': '妖击',
        'Unnatural Force': '重妖击',
        'Unnatural Wail': '诡异的咒声',
        'Upwell': '水流',
        'Vengeful Flame': '怨咒之火',
        'Vengeful Pyre': '怨咒之重火',
        'Vengeful Souls': '黑赤招魂',
        'Vermilion Aura': '赤妖弹',
        'Vortex of the Thunder Eye': '涡雷连舞之环圆',
        'Worldly Pursuit': '跳鼠痛击',
      },
    },
    {
      'locale': 'ko',
      'replaceSync': {
        'Ashigaru Kyuhei': '하급 궁병',
        'Ball of Levin': '번개 구체',
        'Devilish Thrall': '현혹된 시체귀신',
        'Gorai the Uncaged': '무쇠쥐 고우라이',
        'Moko the Restless': '원령 모우코',
        'Moko\'s Shadow': '모우코의 환영',
        'Oni\'s Claw': '악귀의 팔',
        'Shishio': '사자왕',
        'Shishu Fuko': '시슈 폭풍신',
        'Shishu Furutsubaki': '시슈 동백요괴',
        'Shishu Kotengu': '시슈 작은 텐구',
        'Shishu Onmitsugashira': '시슈 밀정 두목',
        'Shishu Raiko': '시슈 천둥신',
        'Shishu Yuki': '시슈 그림자요괴',
        'The Trial Of Benevolence': '복덕의 시련',
        'The Trial Of Responsibility': '수덕의 시련',
        'The Trial Of Wisdom': '지덕의 시련',
      },
      'replaceText': {
        '\\(circles\\)': '(원)',
        '\\(lines\\)': '(직선)',
        'Azure Auspice': '청제 검기',
        'Boundless Azure': '청제 공섬도',
        'Boundless Scarlet': '적제 공섬도',
        'Brazen Ballad': '비파의 선율',
        '(?<!Levin)Burst': '폭발',
        'Clearout': '휩쓸기',
        'Cloud to Ground': '습뢰',
        'Double Iai-giri': '이단 거합 준족베기',
        'Enkyo': '원숭이 포효',
        'Explosion': '폭발',
        'Eye of the Thunder Vortex': '와뢰 연무: 내외측',
        'Falling Rock': '낙석',
        'Far Edge': '원거리 찌르기',
        'Fighting Spirits': '반야탕',
        'Fire Spread': '방화',
        'Flame and Sulphur': '바위불 소환',
        'Fleeting Iai-giri': '거합 준족베기',
        'Flickering Flame': '귀신불 소환',
        'Flintlock': '화포',
        'Great Ball of Fire': '화염구',
        'Greater Ball of Fire': '겹불덩이',
        'Haunting Cry': '섬뜩한 괴성',
        'Humble Hammer': '요술 망치',
        'Impure Purgation': '염류',
        'Invocation of Vengeance': '원한의 기도',
        'Iron Rain': '화살비',
        'Iron Storm': '화살폭풍',
        'Kenki Release': '검기 해방',
        'Lateral Slice': '몸통 가로베기',
        'Left Swipe': '좌측 할퀴기',
        'Levinburst': '번개 발산',
        'Living Hell': '삼계화택',
        'Malformed Prayer': '염주 각인',
        'Malformed Reincarnation': '변신 염주 각인',
        'Moonless Night': '암야 베기',
        'Near Edge': '근거리 찌르기',
        'Noble Pursuit': '사자왕의 송곳니',
        'Pointed Purgation': '조준 염류',
        'Right Swipe': '우측 할퀴기',
        'Rousing Reincarnation': '변신 저주',
        'Scarlet Auspice': '적제 검기',
        'Seal of Scurrying Sparks': '불씨 뿌리기',
        'Shadow Kasumi-giri': '환영 안개베기',
        'Shadow-twin': '환영 부르기',
        'Shock': '방전',
        'Slither': '뱀꼬리 후리기',
        'Smokeater': '안개 흡입',
        'Soldiers of Death': '시체병 부르기',
        'Splitting Cry': '영명포',
        'Stormcloud Summons': '번개구름 생성',
        'Stygian Aura': '흑요탄',
        '(?<!Eye of the )Thunder Vortex': '외측 와뢰',
        'Thundercall': '초뢰',
        'Torching Torment': '번열',
        'Triple Kasumi-giri': '삼단 안개베기',
        'Unenlightenment': '번뇌치성',
        'Unnatural Ailment': '섬뜩한 폭발',
        'Unnatural Force': '섬뜩한 강력 폭발',
        'Unnatural Wail': '섬뜩한 저주',
        'Upwell': '물길',
        'Vengeful Flame': '원한의 불',
        'Vengeful Pyre': '원한의 겹불',
        'Vengeful Souls': '요탄 소환',
        'Vermilion Aura': '적요탄',
        'Vortex of the Thunder Eye': '와뢰 연무: 외내측',
        'Worldly Pursuit': '쥐 도약격',
      },
    },
  ],
};

export default triggerSet;
