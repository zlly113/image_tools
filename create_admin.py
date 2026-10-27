import sys
import os
import sqlite3
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def main():
    if len(sys.argv) < 3:
        print("用法: python3 create_admin.py <邮箱> <密码> [用户名]")
        print("示例: python3 create_admin.py admin@hhdzai.top mysecurepwd123 admin")
        return

    email = sys.argv[1].strip().lower()
    password = sys.argv[2].strip()
    username = sys.argv[3].strip() if len(sys.argv) >= 4 else "admin"

    db_path = os.getenv("DB_PATH", "data/toolbox.db")
    if not os.path.exists(db_path):
        alt = os.path.join(os.path.dirname(__file__), "data", "toolbox.db")
        if os.path.exists(alt):
            db_path = alt

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    pwd_hash = hash_password(password)

    cur.execute("SELECT id, username, role FROM users WHERE email = ?", (email,))
    row = cur.fetchone()

    if row:
        user_id = row[0]
        cur.execute(
            "UPDATE users SET role = 'superadmin', password_hash = ?, is_active = 1 WHERE id = ?",
            (pwd_hash, user_id)
        )
        conn.commit()
        print(f"✅ 成功将现有用户 (UID: {user_id}, 邮箱: {email}) 设为超级管理员 (superadmin)，密码已更新！")
    else:
        cur.execute(
            "INSERT INTO users (username, email, password_hash, role, credit_balance, is_active) VALUES (?, ?, ?, 'superadmin', 99999, 1)",
            (username, email, pwd_hash)
        )
        conn.commit()
        print(f"✅ 成功创建超级管理员账号！\n  UID : {cur.lastrowid}\n  邮箱: {email}\n  角色: superadmin")
    conn.close()

if __name__ == "__main__":
    main()
