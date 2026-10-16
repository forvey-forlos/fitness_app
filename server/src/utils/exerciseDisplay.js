const renamedFlyNames = new Map([
  ['正向蝴蝶机', '正向飞鸟'],
  ['蝴蝶机夹胸', '正向飞鸟'],
  ['反向蝴蝶机', '反向飞鸟']
])

function exerciseDisplayName(name) {
  return renamedFlyNames.get(name) || name
}

function displayExerciseContent(exercises) {
  return exercises.map(item => ({ ...item, exerciseName: exerciseDisplayName(item.exerciseName) }))
}

module.exports = { exerciseDisplayName, displayExerciseContent }
