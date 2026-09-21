const bodyParts=['chest','back','shoulder','arms','legs','glutes','core','full_body','cardio','other']
const recordMethods=['weight','reps','distance','duration','incline','angle','other']
const equipmentTypes=['barbell','dumbbell','machine','cable','bodyweight','kettlebell','band','cardio_machine','other']
const muscleParts={
  pectoralis_major:['chest'],pectoralis_minor:['chest'],serratus_anterior:['chest','shoulder'],
  latissimus_dorsi:['back'],trapezius:['back','shoulder'],rhomboids:['back'],erector_spinae:['back','core'],teres_major:['back'],
  anterior_deltoid:['shoulder'],lateral_deltoid:['shoulder'],posterior_deltoid:['shoulder','back'],rotator_cuff:['shoulder'],
  biceps:['arms'],triceps:['arms'],brachialis:['arms'],brachioradialis:['arms'],forearm_flexors:['arms'],forearm_extensors:['arms'],
  quadriceps:['legs'],hamstrings:['legs','glutes'],adductors:['legs','glutes'],calves:['legs'],tibialis_anterior:['legs'],
  gluteus_maximus:['glutes','legs'],gluteus_medius:['glutes'],gluteus_minimus:['glutes'],
  rectus_abdominis:['core'],transverse_abdominis:['core'],obliques:['core'],multifidus:['core','back'],
  full_body:['full_body'],cardiorespiratory:['cardio'],other:['other']
}
const legacyCategory={core:'abs',glutes:'legs',full_body:'other',cardio:'other',other:'other'}
const legacyMuscle={
  pectoralis_major:'chest',pectoralis_minor:'chest',serratus_anterior:'chest',
  latissimus_dorsi:'back',trapezius:'back',rhomboids:'back',erector_spinae:'back',teres_major:'back',
  anterior_deltoid:'shoulder',lateral_deltoid:'shoulder',posterior_deltoid:'shoulder',rotator_cuff:'shoulder',
  biceps:'biceps',triceps:'triceps',brachialis:'biceps',brachioradialis:'biceps',forearm_flexors:'biceps',forearm_extensors:'biceps',
  quadriceps:'legs',hamstrings:'legs',adductors:'legs',calves:'legs',tibialis_anterior:'legs',
  gluteus_maximus:'glutes',gluteus_medius:'glutes',gluteus_minimus:'glutes',
  rectus_abdominis:'core',transverse_abdominis:'core',obliques:'core',multifidus:'core',
  full_body:'core',cardiorespiratory:'core',other:'core'
}
module.exports={bodyParts,recordMethods,equipmentTypes,muscleParts,legacyCategory,legacyMuscle}
