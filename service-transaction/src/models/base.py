

from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    
    @declared_attr.directive
    def __table_args__(cls):
        return {"schema": "transaction_service"}
