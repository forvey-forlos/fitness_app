const pool=require('../config/db')
const publicationSelect=`p.id,p.author_user_id,p.title,p.description,p.tags,p.duration_minutes,p.content,p.download_count,p.created_at,
  COALESCE(u.display_name,u.username) AS author_name,u.avatar_url AS author_avatar_url,
  (SELECT COUNT(*) FROM template_publication_reactions r WHERE r.publication_id=p.id AND r.kind='like') AS like_count,
  (SELECT COUNT(*) FROM template_publication_reactions r WHERE r.publication_id=p.id AND r.kind='favorite') AS favorite_count,
  EXISTS(SELECT 1 FROM template_publication_reactions r WHERE r.publication_id=p.id AND r.user_id=? AND r.kind='like') AS liked,
  EXISTS(SELECT 1 FROM template_publication_reactions r WHERE r.publication_id=p.id AND r.user_id=? AND r.kind='favorite') AS favorited`

async function listMine(userId){const[rows]=await pool.execute('SELECT * FROM training_templates WHERE user_id=? AND deleted_at IS NULL ORDER BY updated_at DESC,id DESC LIMIT 500',[userId]);return rows}
async function findMine(userId,id){const[rows]=await pool.execute('SELECT * FROM training_templates WHERE id=? AND user_id=? AND deleted_at IS NULL LIMIT 1',[id,userId]);return rows[0]||null}
async function create(record){await pool.execute('INSERT INTO training_templates (id,user_id,name,duration_minutes,content,source_publication_id) VALUES (?,?,?,?,?,?)',[record.id,record.userId,record.name,record.durationMinutes,JSON.stringify(record.exercises),record.sourcePublicationId||null])}
async function update(userId,id,version,record){const[result]=await pool.execute('UPDATE training_templates SET name=?,duration_minutes=?,content=?,version=version+1,updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND version=? AND deleted_at IS NULL',[record.name,record.durationMinutes,JSON.stringify(record.exercises),id,userId,version]);return result.affectedRows===1}
async function remove(userId,id){const[result]=await pool.execute('UPDATE training_templates SET deleted_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND deleted_at IS NULL',[id,userId]);return result.affectedRows===1}

async function listPublic(userId,{q='',scope='all',page=1,pageSize=20}={}){
  const where=['u.status=\'active\'','u.deleted_at IS NULL'],params=[userId,userId]
  if(q){where.push('(INSTR(LOWER(p.title),?)>0 OR INSTR(LOWER(p.description),?)>0 OR INSTR(LOWER(CAST(p.tags AS CHAR)),?)>0)');params.push(q,q,q)}
  if(scope==='favorites'){where.push("EXISTS(SELECT 1 FROM template_publication_reactions f WHERE f.publication_id=p.id AND f.user_id=? AND f.kind='favorite')");params.push(userId)}
  if(scope==='mine'){where.push('p.author_user_id=?');params.push(userId)}
  const from='FROM template_publications p JOIN users u ON u.id=p.author_user_id WHERE '+where.join(' AND ')
  const[countRows]=await pool.execute('SELECT COUNT(*) AS total '+from,params.slice(2))
  const[rows]=await pool.execute(`SELECT ${publicationSelect} ${from} ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize])
  return{rows,total:Number(countRows[0].total)}
}
async function findPublic(userId,id){const[rows]=await pool.execute(`SELECT ${publicationSelect} FROM template_publications p JOIN users u ON u.id=p.author_user_id WHERE p.id=? AND u.status='active' AND u.deleted_at IS NULL LIMIT 1`,[userId,userId,id]);return rows[0]||null}
async function publish(record){await pool.execute('INSERT INTO template_publications (id,author_user_id,title,description,tags,duration_minutes,content) VALUES (?,?,?,?,?,?,?)',[record.id,record.userId,record.title,record.description,JSON.stringify(record.tags),record.durationMinutes,JSON.stringify(record.exercises)])}
async function removePublication(userId,id){const[result]=await pool.execute('DELETE FROM template_publications WHERE id=? AND author_user_id=?',[id,userId]);return result.affectedRows===1}
async function setReaction(userId,id,kind,active){const connection=await pool.getConnection();try{
  await connection.beginTransaction()
  const[rows]=await connection.execute('SELECT id FROM template_publications WHERE id=? FOR UPDATE',[id])
  if(!rows.length){await connection.rollback();return false}
  if(active)await connection.execute('INSERT IGNORE INTO template_publication_reactions (publication_id,user_id,kind) VALUES (?,?,?)',[id,userId,kind])
  else await connection.execute('DELETE FROM template_publication_reactions WHERE publication_id=? AND user_id=? AND kind=?',[id,userId,kind])
  await connection.commit();return true
}catch(error){await connection.rollback();throw error}finally{connection.release()}}

async function importPublicationWithPool(db,userId,publicationId,record){const connection=await db.getConnection();try{
  await connection.beginTransaction()
  const[posts]=await connection.execute('SELECT id FROM template_publications WHERE id=? FOR UPDATE',[publicationId])
  if(!posts.length){await connection.rollback();return false}
  for(const exerciseId of [...new Set(record.exercises.map(item=>item.exerciseId))]){
    const[available]=await connection.execute('SELECT id FROM exercises WHERE id=? AND is_system=1 AND owner_user_id IS NULL AND deleted_at IS NULL FOR SHARE',[exerciseId])
    if(!available.length)throw new Error('Referenced system exercise unavailable')
    await connection.execute(`INSERT INTO user_exercise_preferences (user_id,exercise_id,version,created_at,updated_at,deleted_at)
      SELECT ?,e.id,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),NULL FROM exercises e
      WHERE e.id=? AND e.is_system=1 AND e.owner_user_id IS NULL AND e.deleted_at IS NULL
      ON DUPLICATE KEY UPDATE version=IF(deleted_at IS NULL,version,version+1),updated_at=IF(deleted_at IS NULL,updated_at,UTC_TIMESTAMP(3)),deleted_at=NULL`,[userId,exerciseId])
  }
  await connection.execute('INSERT INTO training_templates (id,user_id,name,duration_minutes,content,source_publication_id) VALUES (?,?,?,?,?,?)',[record.id,userId,record.name,record.durationMinutes,JSON.stringify(record.exercises),publicationId])
  await connection.execute('UPDATE template_publications SET download_count=download_count+1 WHERE id=?',[publicationId])
  await connection.commit();return true
}catch(error){await connection.rollback();throw error}finally{connection.release()}}
async function importPublication(userId,publicationId,record){return importPublicationWithPool(pool,userId,publicationId,record)}

module.exports={listMine,findMine,create,update,remove,listPublic,findPublic,publish,removePublication,setReaction,importPublication,importPublicationWithPool}
