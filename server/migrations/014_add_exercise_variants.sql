-- MySQL 8.0. Run once after 013_expand_exercise_metadata.sql.
-- A variant owns its primary/secondary muscle mapping.
SET time_zone = '+00:00';

ALTER TABLE exercises
  ADD COLUMN variants JSON NULL AFTER secondary_muscles;

UPDATE exercises
SET variants = CASE name
  WHEN '高位下拉' THEN JSON_ARRAY(
    JSON_OBJECT('id','wide_overhand','name','宽握正握','primaryMuscles',JSON_ARRAY('latissimus_dorsi'),'secondaryMuscles',JSON_ARRAY('teres_major','biceps')),
    JSON_OBJECT('id','narrow_neutral','name','窄握中立','primaryMuscles',JSON_ARRAY('latissimus_dorsi'),'secondaryMuscles',JSON_ARRAY('biceps','teres_major')))
  WHEN '杠铃平板卧推' THEN JSON_ARRAY(
    JSON_OBJECT('id','wide_grip','name','宽握','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('anterior_deltoid','triceps')),
    JSON_OBJECT('id','close_grip','name','窄握','primaryMuscles',JSON_ARRAY('triceps','pectoralis_major'),'secondaryMuscles',JSON_ARRAY('anterior_deltoid')))
  WHEN '哑铃上斜卧推' THEN JSON_ARRAY(
    JSON_OBJECT('id','overhand','name','正握','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('anterior_deltoid','triceps')),
    JSON_OBJECT('id','neutral','name','中立握','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('triceps')))
  WHEN '蝴蝶机夹胸' THEN JSON_ARRAY(
    JSON_OBJECT('id','bilateral','name','双侧夹胸','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('anterior_deltoid')),
    JSON_OBJECT('id','unilateral','name','单侧夹胸','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('serratus_anterior')))
  WHEN '标准俯卧撑' THEN JSON_ARRAY(
    JSON_OBJECT('id','wide','name','宽距','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('anterior_deltoid','triceps')),
    JSON_OBJECT('id','diamond','name','钻石式','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY('pectoralis_major','anterior_deltoid')))
  WHEN '杠铃俯身划船' THEN JSON_ARRAY(
    JSON_OBJECT('id','overhand','name','正握','primaryMuscles',JSON_ARRAY('latissimus_dorsi','rhomboids'),'secondaryMuscles',JSON_ARRAY('trapezius','biceps')),
    JSON_OBJECT('id','underhand','name','反握','primaryMuscles',JSON_ARRAY('latissimus_dorsi'),'secondaryMuscles',JSON_ARRAY('biceps','rhomboids')))
  WHEN '单臂哑铃划船' THEN JSON_ARRAY(
    JSON_OBJECT('id','elbow_close','name','肘部贴身','primaryMuscles',JSON_ARRAY('latissimus_dorsi'),'secondaryMuscles',JSON_ARRAY('teres_major','biceps')),
    JSON_OBJECT('id','elbow_out','name','肘部外展','primaryMuscles',JSON_ARRAY('rhomboids','posterior_deltoid'),'secondaryMuscles',JSON_ARRAY('trapezius')))
  WHEN '引体向上' THEN JSON_ARRAY(
    JSON_OBJECT('id','wide_overhand','name','宽握正握','primaryMuscles',JSON_ARRAY('latissimus_dorsi'),'secondaryMuscles',JSON_ARRAY('teres_major','biceps')),
    JSON_OBJECT('id','narrow_neutral','name','窄握中立','primaryMuscles',JSON_ARRAY('latissimus_dorsi','biceps'),'secondaryMuscles',JSON_ARRAY('rhomboids')))
  WHEN '杠铃推举' THEN JSON_ARRAY(
    JSON_OBJECT('id','standing','name','站姿','primaryMuscles',JSON_ARRAY('anterior_deltoid','lateral_deltoid'),'secondaryMuscles',JSON_ARRAY('triceps','trapezius')),
    JSON_OBJECT('id','seated','name','坐姿','primaryMuscles',JSON_ARRAY('anterior_deltoid'),'secondaryMuscles',JSON_ARRAY('lateral_deltoid','triceps')))
  WHEN '哑铃侧平举' THEN JSON_ARRAY(
    JSON_OBJECT('id','standing','name','站姿','primaryMuscles',JSON_ARRAY('lateral_deltoid'),'secondaryMuscles',JSON_ARRAY('trapezius')),
    JSON_OBJECT('id','leaning','name','倾斜式','primaryMuscles',JSON_ARRAY('lateral_deltoid'),'secondaryMuscles',JSON_ARRAY('rotator_cuff')))
  WHEN '坐姿肩推机' THEN JSON_ARRAY(
    JSON_OBJECT('id','overhand','name','正握','primaryMuscles',JSON_ARRAY('anterior_deltoid','lateral_deltoid'),'secondaryMuscles',JSON_ARRAY('triceps')),
    JSON_OBJECT('id','neutral','name','中立握','primaryMuscles',JSON_ARRAY('anterior_deltoid'),'secondaryMuscles',JSON_ARRAY('triceps')))
  WHEN '绳索面拉' THEN JSON_ARRAY(
    JSON_OBJECT('id','high_pull','name','高位面拉','primaryMuscles',JSON_ARRAY('posterior_deltoid','trapezius'),'secondaryMuscles',JSON_ARRAY('rhomboids','rotator_cuff')),
    JSON_OBJECT('id','low_pull','name','低位面拉','primaryMuscles',JSON_ARRAY('posterior_deltoid','rhomboids'),'secondaryMuscles',JSON_ARRAY('rotator_cuff')))
  WHEN '杠铃弯举' THEN JSON_ARRAY(
    JSON_OBJECT('id','wide_grip','name','宽握','primaryMuscles',JSON_ARRAY('biceps'),'secondaryMuscles',JSON_ARRAY('brachialis')),
    JSON_OBJECT('id','narrow_grip','name','窄握','primaryMuscles',JSON_ARRAY('biceps'),'secondaryMuscles',JSON_ARRAY('brachioradialis')))
  WHEN '哑铃锤式弯举' THEN JSON_ARRAY(
    JSON_OBJECT('id','alternating','name','交替式','primaryMuscles',JSON_ARRAY('brachialis','brachioradialis'),'secondaryMuscles',JSON_ARRAY('biceps')),
    JSON_OBJECT('id','cross_body','name','交叉锤式','primaryMuscles',JSON_ARRAY('brachioradialis'),'secondaryMuscles',JSON_ARRAY('brachialis','biceps')))
  WHEN '牧师凳弯举机' THEN JSON_ARRAY(
    JSON_OBJECT('id','wide_grip','name','宽握','primaryMuscles',JSON_ARRAY('biceps'),'secondaryMuscles',JSON_ARRAY('brachialis')),
    JSON_OBJECT('id','narrow_grip','name','窄握','primaryMuscles',JSON_ARRAY('biceps'),'secondaryMuscles',JSON_ARRAY('brachioradialis')))
  WHEN '绳索弯举' THEN JSON_ARRAY(
    JSON_OBJECT('id','straight_bar','name','直杆','primaryMuscles',JSON_ARRAY('biceps'),'secondaryMuscles',JSON_ARRAY('brachialis')),
    JSON_OBJECT('id','rope','name','绳索锤式','primaryMuscles',JSON_ARRAY('brachialis','brachioradialis'),'secondaryMuscles',JSON_ARRAY('biceps')))
  WHEN '窄握杠铃卧推' THEN JSON_ARRAY(
    JSON_OBJECT('id','shoulder_width','name','肩宽握距','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY('pectoralis_major','anterior_deltoid')),
    JSON_OBJECT('id','very_narrow','name','超窄握距','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY('anterior_deltoid')))
  WHEN '哑铃颈后臂屈伸' THEN JSON_ARRAY(
    JSON_OBJECT('id','two_arm','name','双手单哑铃','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY()),
    JSON_OBJECT('id','single_arm','name','单臂','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY()))
  WHEN '绳索下压' THEN JSON_ARRAY(
    JSON_OBJECT('id','rope','name','绳索外旋','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY()),
    JSON_OBJECT('id','straight_bar','name','直杆下压','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY('forearm_flexors')))
  WHEN '双杠臂屈伸' THEN JSON_ARRAY(
    JSON_OBJECT('id','upright','name','直立式','primaryMuscles',JSON_ARRAY('triceps'),'secondaryMuscles',JSON_ARRAY('pectoralis_major','anterior_deltoid')),
    JSON_OBJECT('id','forward_lean','name','前倾式','primaryMuscles',JSON_ARRAY('pectoralis_major'),'secondaryMuscles',JSON_ARRAY('triceps','anterior_deltoid')))
  WHEN '杠铃深蹲' THEN JSON_ARRAY(
    JSON_OBJECT('id','high_bar','name','高杠位','primaryMuscles',JSON_ARRAY('quadriceps','gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings','erector_spinae')),
    JSON_OBJECT('id','low_bar','name','低杠位','primaryMuscles',JSON_ARRAY('gluteus_maximus','hamstrings'),'secondaryMuscles',JSON_ARRAY('quadriceps','erector_spinae')))
  WHEN '哑铃箭步蹲' THEN JSON_ARRAY(
    JSON_OBJECT('id','forward','name','向前箭步','primaryMuscles',JSON_ARRAY('quadriceps','gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings')),
    JSON_OBJECT('id','reverse','name','反向箭步','primaryMuscles',JSON_ARRAY('gluteus_maximus','quadriceps'),'secondaryMuscles',JSON_ARRAY('hamstrings')))
  WHEN '坐姿腿举' THEN JSON_ARRAY(
    JSON_OBJECT('id','high_feet','name','高脚位','primaryMuscles',JSON_ARRAY('gluteus_maximus','hamstrings'),'secondaryMuscles',JSON_ARRAY('quadriceps')),
    JSON_OBJECT('id','low_feet','name','低脚位','primaryMuscles',JSON_ARRAY('quadriceps'),'secondaryMuscles',JSON_ARRAY('gluteus_maximus')))
  WHEN '徒手深蹲' THEN JSON_ARRAY(
    JSON_OBJECT('id','standard','name','标准站距','primaryMuscles',JSON_ARRAY('quadriceps','gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings')),
    JSON_OBJECT('id','sumo','name','相扑站距','primaryMuscles',JSON_ARRAY('gluteus_maximus','adductors'),'secondaryMuscles',JSON_ARRAY('quadriceps')))
  WHEN '杠铃臀推' THEN JSON_ARRAY(
    JSON_OBJECT('id','standard','name','标准臀推','primaryMuscles',JSON_ARRAY('gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings')),
    JSON_OBJECT('id','pause','name','顶峰停顿','primaryMuscles',JSON_ARRAY('gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings')))
  WHEN '哑铃罗马尼亚硬拉' THEN JSON_ARRAY(
    JSON_OBJECT('id','bilateral','name','双腿式','primaryMuscles',JSON_ARRAY('hamstrings','gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('erector_spinae')),
    JSON_OBJECT('id','single_leg','name','单腿式','primaryMuscles',JSON_ARRAY('hamstrings','gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('gluteus_medius')))
  WHEN '绳索后踢腿' THEN JSON_ARRAY(
    JSON_OBJECT('id','straight_leg','name','直腿后踢','primaryMuscles',JSON_ARRAY('gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings')),
    JSON_OBJECT('id','bent_knee','name','屈膝后踢','primaryMuscles',JSON_ARRAY('gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('gluteus_medius')))
  WHEN '臀桥' THEN JSON_ARRAY(
    JSON_OBJECT('id','bilateral','name','双腿臀桥','primaryMuscles',JSON_ARRAY('gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings')),
    JSON_OBJECT('id','single_leg','name','单腿臀桥','primaryMuscles',JSON_ARRAY('gluteus_maximus'),'secondaryMuscles',JSON_ARRAY('hamstrings','gluteus_medius')))
  WHEN '平板支撑' THEN JSON_ARRAY(
    JSON_OBJECT('id','forearm','name','肘撑','primaryMuscles',JSON_ARRAY('transverse_abdominis','rectus_abdominis'),'secondaryMuscles',JSON_ARRAY('obliques','gluteus_maximus')),
    JSON_OBJECT('id','high_plank','name','直臂支撑','primaryMuscles',JSON_ARRAY('transverse_abdominis'),'secondaryMuscles',JSON_ARRAY('rectus_abdominis','anterior_deltoid')))
  WHEN '卷腹' THEN JSON_ARRAY(
    JSON_OBJECT('id','standard','name','标准卷腹','primaryMuscles',JSON_ARRAY('rectus_abdominis'),'secondaryMuscles',JSON_ARRAY('obliques')),
    JSON_OBJECT('id','twisting','name','交替转体','primaryMuscles',JSON_ARRAY('obliques'),'secondaryMuscles',JSON_ARRAY('rectus_abdominis')))
  WHEN '绳索卷腹' THEN JSON_ARRAY(
    JSON_OBJECT('id','kneeling','name','跪姿','primaryMuscles',JSON_ARRAY('rectus_abdominis'),'secondaryMuscles',JSON_ARRAY('obliques')),
    JSON_OBJECT('id','standing','name','站姿','primaryMuscles',JSON_ARRAY('rectus_abdominis','obliques'),'secondaryMuscles',JSON_ARRAY('transverse_abdominis')))
  WHEN '悬垂举腿' THEN JSON_ARRAY(
    JSON_OBJECT('id','bent_knee','name','屈膝举腿','primaryMuscles',JSON_ARRAY('rectus_abdominis'),'secondaryMuscles',JSON_ARRAY('obliques')),
    JSON_OBJECT('id','straight_leg','name','直腿举腿','primaryMuscles',JSON_ARRAY('rectus_abdominis'),'secondaryMuscles',JSON_ARRAY('obliques','transverse_abdominis')))
  ELSE JSON_ARRAY()
END
WHERE is_system = 1 AND deleted_at IS NULL;

-- Verification:
-- SELECT name, JSON_PRETTY(variants) FROM exercises
-- WHERE is_system = 1 AND deleted_at IS NULL ORDER BY name;
