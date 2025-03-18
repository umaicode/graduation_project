import pandas as pd
from sqlalchemy import create_engine

# MySQL 연결 설정 (SQLAlchemy 사용)
DB_USER = "root"
DB_PASSWORD = "0010"  # 본인의 MySQL 비밀번호로 변경
DB_HOST = "localhost"
DB_NAME = "drowsiness_db"

# MySQL 연결 (SQLAlchemy)
engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}")

# SQL 쿼리 실행 후 데이터를 Pandas DataFrame으로 변환
query = "SELECT * FROM drowsiness_log ORDER BY id DESC"  # 최근 데이터부터 정렬
df = pd.read_sql(query, con=engine)

# 콘솔에 DataFrame 출력
print(df)

# 연결 종료
engine.dispose()
