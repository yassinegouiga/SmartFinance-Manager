
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'bf742a56e6c8'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('categories',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('icon', sa.String(), nullable=True),
    sa.Column('color', sa.String(), nullable=True),
    sa.Column('type', sa.Enum('INCOME', 'EXPENSE', name='categorytype'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    schema='transaction_service'
    )
    op.create_table('transactions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.String(length=128), nullable=False),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('type', sa.Enum('INCOME', 'EXPENSE', name='transactiontype'), nullable=False),
    sa.Column('category_id', sa.UUID(), nullable=False),
    sa.Column('date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('is_recurring', sa.Boolean(), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['transaction_service.categories.id'], ),
    sa.PrimaryKeyConstraint('id'),
    schema='transaction_service'
    )
    op.create_index(op.f('ix_transaction_service_transactions_user_id'), 'transactions', ['user_id'], unique=False, schema='transaction_service')



def downgrade() -> None:
    op.drop_index(op.f('ix_transaction_service_transactions_user_id'), table_name='transactions', schema='transaction_service')
    op.drop_table('transactions', schema='transaction_service')
    op.drop_table('categories', schema='transaction_service')

