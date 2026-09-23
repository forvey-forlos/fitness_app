export const bodyPartOptions=[
  {key:'chest',name:'胸部'},{key:'back',name:'背部'},{key:'shoulder',name:'肩部'},
  {key:'arms',name:'手臂'},{key:'legs',name:'腿部'},{key:'glutes',name:'臀部'},
  {key:'core',name:'核心'},{key:'full_body',name:'全身'},{key:'cardio',name:'有氧'},{key:'other',name:'其他'}
]

export const recordMethodOptions=[
  {key:'weight',name:'重量',unit:'kg'},{key:'reps',name:'次数',unit:'次'},{key:'distance',name:'距离',unit:'km'},
  {key:'duration',name:'持续时间',unit:'分钟'},{key:'speed',name:'速度',unit:'km/h'},{key:'incline',name:'坡度',unit:'%'},
  {key:'assistance_weight',name:'辅助重量',unit:'kg'},{key:'rir',name:'RIR',unit:'次'},{key:'rpe',name:'RPE',unit:'分'},
  {key:'angle',name:'角度',unit:'°'},{key:'other',name:'其他',unit:''}
]

export const equipmentOptions=[
  {key:'barbell',name:'杠铃'},{key:'dumbbell',name:'哑铃'},{key:'machine',name:'固定器械'},
  {key:'cable',name:'绳索'},{key:'bodyweight',name:'徒手'},{key:'kettlebell',name:'壶铃'},
  {key:'band',name:'弹力带'},{key:'cardio_machine',name:'有氧器械'},{key:'other',name:'其他'}
]

export const muscleOptions=[
  {key:'pectoralis_major',name:'胸大肌',parts:['chest']},{key:'pectoralis_minor',name:'胸小肌',parts:['chest']},{key:'serratus_anterior',name:'前锯肌',parts:['chest','shoulder']},
  {key:'latissimus_dorsi',name:'背阔肌',parts:['back']},{key:'trapezius',name:'斜方肌',parts:['back','shoulder']},{key:'rhomboids',name:'菱形肌',parts:['back']},{key:'erector_spinae',name:'竖脊肌',parts:['back','core']},{key:'teres_major',name:'大圆肌',parts:['back']},
  {key:'anterior_deltoid',name:'三角肌前束',parts:['shoulder']},{key:'lateral_deltoid',name:'三角肌中束',parts:['shoulder']},{key:'posterior_deltoid',name:'三角肌后束',parts:['shoulder','back']},{key:'rotator_cuff',name:'肩袖肌群',parts:['shoulder']},
  {key:'biceps',name:'肱二头肌',parts:['arms']},{key:'triceps',name:'肱三头肌',parts:['arms']},{key:'brachialis',name:'肱肌',parts:['arms']},{key:'brachioradialis',name:'肱桡肌',parts:['arms']},{key:'forearm_flexors',name:'前臂屈肌群',parts:['arms']},{key:'forearm_extensors',name:'前臂伸肌群',parts:['arms']},
  {key:'quadriceps',name:'股四头肌',parts:['legs']},{key:'hamstrings',name:'腘绳肌',parts:['legs','glutes']},{key:'adductors',name:'内收肌群',parts:['legs','glutes']},{key:'calves',name:'小腿三头肌',parts:['legs']},{key:'tibialis_anterior',name:'胫骨前肌',parts:['legs']},
  {key:'gluteus_maximus',name:'臀大肌',parts:['glutes','legs']},{key:'gluteus_medius',name:'臀中肌',parts:['glutes']},{key:'gluteus_minimus',name:'臀小肌',parts:['glutes']},
  {key:'rectus_abdominis',name:'腹直肌',parts:['core']},{key:'transverse_abdominis',name:'腹横肌',parts:['core']},{key:'obliques',name:'腹斜肌',parts:['core']},{key:'multifidus',name:'多裂肌',parts:['core','back']},
  {key:'full_body',name:'全身综合',parts:['full_body']},{key:'cardiorespiratory',name:'心肺系统',parts:['cardio']},{key:'other',name:'其他',parts:['other']}
]

export const bodyPartName=key=>bodyPartOptions.find(item=>item.key===key)?.name||key
export const recordMethodName=key=>recordMethodOptions.find(item=>item.key===key)?.name||key
export const recordMethodUnit=key=>recordMethodOptions.find(item=>item.key===key)?.unit||''
export const recordMethodLabel=key=>{const name=recordMethodName(key),unit=recordMethodUnit(key);return unit?`${name}（${unit}）`:name}
export const equipmentName=key=>equipmentOptions.find(item=>item.key===key)?.name||key||'其他'
export const muscleName=key=>muscleOptions.find(item=>item.key===key)?.name||key

const initialBoundaries='阿八嚓哒妸发旮哈讥咔垃妈拿噢啪期然撒塌挖昔压匝'
const initials='ABCDEFGHJKLMNOPQRSTWXYZ'
export function pinyinInitial(name=''){
  const first=String(name).trim().charAt(0)
  if(!first)return'#'
  if(/[A-Za-z]/.test(first))return first.toUpperCase()
  for(let index=initialBoundaries.length-1;index>=0;index--){
    try{if(first.localeCompare(initialBoundaries[index],'zh-CN-u-co-pinyin')>=0)return initials[index]}catch(_){break}
  }
  return'#'
}

export function compareExerciseName(a,b){
  try{return a.name.localeCompare(b.name,'zh-CN-u-co-pinyin',{numeric:true,sensitivity:'base'})}
  catch(_){return a.name.localeCompare(b.name)}
}
