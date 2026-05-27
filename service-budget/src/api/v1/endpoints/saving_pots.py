from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_saving_pot, crud_pot_transaction
from src.schemas.saving_pot import SavingPotCreate, SavingPotUpdate, SavingPotResponse
from src.schemas.pot_transaction import PotTransactionCreate, PotTransactionResponse
from src.models.pot_transaction import TransactionType

router = APIRouter()

@router.post("/", response_model=SavingPotResponse, status_code=status.HTTP_201_CREATED)
async def create_saving_pot(
    pot: SavingPotCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    return await crud_saving_pot.create_saving_pot(db=db, pot=pot, user_id=user_id)

@router.get("/", response_model=List[SavingPotResponse])
async def read_saving_pots(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    return await crud_saving_pot.get_saving_pots(db, user_id=user_id, skip=skip, limit=limit)

@router.get("/{pot_id}", response_model=SavingPotResponse)
async def read_saving_pot(
    pot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    pot = await crud_saving_pot.get_saving_pot(db, pot_id=pot_id, user_id=user_id)
    if not pot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saving pot not found")
    return pot

@router.put("/{pot_id}", response_model=SavingPotResponse)
async def update_saving_pot(
    pot_id: UUID,
    pot_update: SavingPotUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    db_pot = await crud_saving_pot.get_saving_pot(db, pot_id=pot_id, user_id=user_id)
    if not db_pot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saving pot not found")
    return await crud_saving_pot.update_saving_pot(db=db, db_pot=db_pot, pot_update=pot_update)

@router.delete("/{pot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saving_pot(
    pot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    db_pot = await crud_saving_pot.get_saving_pot(db, pot_id=pot_id, user_id=user_id)
    if not db_pot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saving pot not found")
    await crud_saving_pot.delete_saving_pot(db=db, db_pot=db_pot)

@router.post("/{pot_id}/deposit", response_model=PotTransactionResponse)
async def deposit_to_pot(
    pot_id: UUID,
    transaction: PotTransactionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    db_pot = await crud_saving_pot.get_saving_pot(db, pot_id=pot_id, user_id=user_id)
    if not db_pot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saving pot not found")
    
    db_txn = await crud_pot_transaction.create_pot_transaction(
        db=db, pot_id=pot_id, amount=transaction.amount, type=TransactionType.DEPOSIT
    )
    await crud_saving_pot.update_saving_pot_amount(db=db, db_pot=db_pot, amount_change=transaction.amount)
    return db_txn

@router.post("/{pot_id}/withdraw", response_model=PotTransactionResponse)
async def withdraw_from_pot(
    pot_id: UUID,
    transaction: PotTransactionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    db_pot = await crud_saving_pot.get_saving_pot(db, pot_id=pot_id, user_id=user_id)
    if not db_pot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saving pot not found")
    
    if db_pot.current_amount < transaction.amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient funds in pot")
        
    db_txn = await crud_pot_transaction.create_pot_transaction(
        db=db, pot_id=pot_id, amount=transaction.amount, type=TransactionType.WITHDRAWAL
    )
    await crud_saving_pot.update_saving_pot_amount(db=db, db_pot=db_pot, amount_change=-transaction.amount)
    return db_txn
