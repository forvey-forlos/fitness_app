export function pageSafeTop(){
  // #ifdef MP-WEIXIN
  const system=uni.getSystemInfoSync()
  const status=Number(system?.statusBarHeight)||0
  const capsule=uni.getMenuButtonBoundingClientRect?.()
  const top=Number(capsule?.top),bottom=Number(capsule?.bottom)
  const gap=Number.isFinite(top)&&top>status?Math.max(8,top-status):10
  return Math.ceil(Number.isFinite(bottom)&&bottom>status?bottom+gap:status+54)
  // #endif
  return 0
}

export function pageSafeStyles(){
  const top=pageSafeTop()
  return top?{shell:{paddingTop:`${top}px`},overlay:{'--page-safe-top':`${top}px`}}:{shell:{},overlay:{'--page-safe-top':'0px'}}
}
