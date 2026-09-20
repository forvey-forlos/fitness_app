const pool=require('../config/db')
async function findByOpenId(appId,openId){const [rows]=await pool.execute(
  `SELECT w.user_id,u.display_name,u.account_code,u.password_hash,u.avatar_url,u.timezone,u.status,u.deleted_at
   FROM wechat_accounts w JOIN users u ON u.id=w.user_id
   WHERE w.app_id=? AND w.open_id=? LIMIT 1`,[appId,openId]);return rows[0]||null}
async function createWithUser(account,user){const connection=await pool.getConnection();try{await connection.beginTransaction();await connection.execute(
  `INSERT INTO users (id,display_name,account_code,username,username_normalized,password_hash,timezone,status)
   VALUES (?,?,?,?,?,?,?,'active')`,[user.id,user.displayName,user.accountCode,user.username,user.usernameNormalized,user.passwordHash,user.timezone]);await connection.execute(
  `INSERT INTO wechat_accounts (id,user_id,app_id,open_id,union_id) VALUES (?,?,?,?,?)`,
  [account.id,user.id,account.appId,account.openId,account.unionId]);await connection.commit()}catch(error){await connection.rollback();throw error}finally{connection.release()}}
async function findByUserAndApp(userId,appId){const [rows]=await pool.execute(
  `SELECT id,user_id,app_id,created_at FROM wechat_accounts WHERE user_id=? AND app_id=? LIMIT 1`,[userId,appId]);return rows[0]||null}
async function bind(account){await pool.execute(
  `INSERT INTO wechat_accounts (id,user_id,app_id,open_id,union_id) VALUES (?,?,?,?,?)`,
  [account.id,account.userId,account.appId,account.openId,account.unionId])}
async function remove(userId,appId){const[result]=await pool.execute(
  `DELETE FROM wechat_accounts WHERE user_id=? AND app_id=?`,[userId,appId]);return result.affectedRows>0}
module.exports={findByOpenId,createWithUser,findByUserAndApp,bind,remove}
