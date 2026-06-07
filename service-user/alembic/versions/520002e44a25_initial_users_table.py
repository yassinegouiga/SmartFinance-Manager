
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '520002e44a25'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('firebase_uid', sa.String(length=128), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('first_name', sa.String(length=100), nullable=True),
    sa.Column('last_name', sa.String(length=100), nullable=True),
    sa.Column('avatar_url', sa.Text(), nullable=True),
    sa.Column('auth_provider', sa.String(length=50), nullable=True),
    sa.Column('currency', sa.String(length=10), nullable=False),
    sa.Column('theme', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    schema='user_service'
    )
    op.create_index(op.f('ix_user_service_users_email'), 'users', ['email'], unique=True, schema='user_service')
    op.create_index(op.f('ix_user_service_users_firebase_uid'), 'users', ['firebase_uid'], unique=True, schema='user_service')



def downgrade() -> None:
    op.drop_index(op.f('ix_user_service_users_firebase_uid'), table_name='users', schema='user_service')
    op.drop_index(op.f('ix_user_service_users_email'), table_name='users', schema='user_service')
    op.drop_table('users', schema='user_service')

