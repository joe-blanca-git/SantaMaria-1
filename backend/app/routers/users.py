from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.core import security
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserPasswordUpdate, UserStatusUpdate, UserAdminUpdate
from app.api.deps import get_current_admin_user

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    """
    Lista todos os usuários. Acesso restrito a administradores.
    """
    users = db.query(User).all()
    
    # Precisamos do role de cada um. Podemos fazer em batch ou no for (tabela pequena, mas batch é melhor)
    query = text("""
        SELECT u.iduser, r.name 
        FROM users u
        LEFT JOIN userrole ur ON u.iduser = ur.idUser
        LEFT JOIN roles r ON ur.idRole = r.idRole
    """)
    result = db.execute(query).fetchall()
    roles_map = {row[0]: row[1] or 'user' for row in result}
    
    response = []
    for u in users:
        response.append(UserResponse(
            name=u.name,
            email=u.email,
            iduser=u.iduser,
            createdAt=u.createdAt,
            active=u.active or 'S',
            role=roles_map.get(u.iduser, 'user')
        ))
    return response

@router.put("/{user_id}/password")
def change_user_password(
    user_id: int, 
    data: UserPasswordUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.iduser == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.password = security.get_password_hash(data.novaSenha)
    db.commit()
    return {"message": "Senha atualizada com sucesso"}

@router.patch("/{user_id}/status")
def change_user_status(
    user_id: int, 
    data: UserStatusUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin_user)
):
    if user_id == current_user.iduser:
        raise HTTPException(status_code=400, detail="Você não pode bloquear/desbloquear a si mesmo.")
        
    user = db.query(User).filter(User.iduser == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.active = 'N' if data.bloqueado else 'S'
    db.commit()
    return {"message": f"Usuário {'bloqueado' if data.bloqueado else 'desbloqueado'} com sucesso"}

@router.patch("/{user_id}/admin")
def change_user_admin(
    user_id: int, 
    data: UserAdminUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.iduser == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # Verificar se já é admin
    check_query = text("SELECT idRole FROM userrole WHERE idUser = :user_id")
    current_role = db.execute(check_query, {"user_id": user_id}).scalar()
    
    target_role = 2 if data.admin else 1 # 2 = admin, 1 = user
    
    if current_role:
        update_query = text("UPDATE userrole SET idRole = :role_id WHERE idUser = :user_id")
        db.execute(update_query, {"role_id": target_role, "user_id": user_id})
    else:
        insert_query = text("INSERT INTO userrole (idUser, idRole) VALUES (:user_id, :role_id)")
        db.execute(insert_query, {"user_id": user_id, "role_id": target_role})
        
    db.commit()
    return {"message": "Permissões atualizadas com sucesso"}
