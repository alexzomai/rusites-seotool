import pandas as pd
from fastapi import APIRouter, File, UploadFile

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.post("/upload_csv")
async def upload_json_from_parser(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    print(df)
