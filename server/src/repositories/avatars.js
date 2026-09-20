const pool=require('../config/db')
async function find(userId){const[rows]=await pool.execute('SELECT mime_type,image_data,byte_size,updated_at FROM user_avatars WHERE user_id=? LIMIT 1',[userId]);return rows[0]||null}
async function save(userId,mimeType,data,url){const connection=await pool.getConnection();try{await connection.beginTransaction();await connection.execute(
  `INSERT INTO user_avatars (user_id,mime_type,image_data,byte_size) VALUES (?,?,?,?)
   ON DUPLICATE KEY UPDATE mime_type=VALUES(mime_type),image_data=VALUES(image_data),byte_size=VALUES(byte_size),updated_at=UTC_TIMESTAMP(3)`,
  [userId,mimeType,data,data.length]);const[result]=await connection.execute(
  `UPDATE users SET avatar_url=?,updated_at=UTC_TIMESTAMP(3) WHERE id=? AND status='active' AND deleted_at IS NULL`,[url,userId]);if(result.affectedRows!==1)throw new Error('User unavailable');await connection.commit()}catch(error){await connection.rollback();throw error}finally{connection.release()}}
async function remove(userId){const connection=await pool.getConnection();try{await connection.beginTransaction();await connection.execute('DELETE FROM user_avatars WHERE user_id=?',[userId]);const[result]=await connection.execute(
  `UPDATE users SET avatar_url=NULL,updated_at=UTC_TIMESTAMP(3) WHERE id=? AND status='active' AND deleted_at IS NULL`,[userId]);if(result.affectedRows!==1)throw new Error('User unavailable');await connection.commit();return true}catch(error){await connection.rollback();throw error}finally{connection.release()}}
module.exports={find,save,remove}
