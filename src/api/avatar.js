import{request,uploadFile,USER_KEY}from'./request'
function updateCachedAvatar(avatarUrl){const user=uni.getStorageSync(USER_KEY);if(user&&typeof user==='object')uni.setStorageSync(USER_KEY,{...user,avatarUrl});return avatarUrl}
export async function uploadAvatar(filePath){const result=await uploadFile({url:'/api/v1/users/me/avatar',filePath,name:'avatar'});updateCachedAvatar(result.avatarUrl);return result}
export async function deleteAvatar(){const result=await request({url:'/api/v1/users/me/avatar',method:'DELETE'});updateCachedAvatar(null);return result}
