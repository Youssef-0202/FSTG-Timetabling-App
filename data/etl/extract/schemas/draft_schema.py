from pydantic import BaseModel, Field, validator
from typing import Optional

class DraftAssignment(BaseModel):
    """
    Schema for the human-reviewable CSV file.
    This links raw data (Excel/OCR) to the final Database models.
    """
    source: str = Field(..., description="Excel or OCR")
    section: str = Field(..., description="e.g., GB-GEG S2")
    semester: str = Field(..., description="e.g., S2")
    module: str = Field(..., description="Module name from Excel/Timetable")
    type: str = Field(..., description="CM, TD, or TP")
    teacher: str = Field(..., description="Teacher Full Name")
    room: Optional[str] = Field(None, description="Room name like Amphi 4")
    day: Optional[str] = Field(None, description="Lundi, Mardi...")
    timeslot: Optional[str] = Field(None, description="e.g., 08:30 - 10:25")
    groups: Optional[str] = Field(None, description="Comma separated list for TD/TP")
    needs_review: bool = True

    @validator('type')
    def normalize_type(cls, v):
        v = v.upper().strip()
        if v not in ['CM', 'TD', 'TP']:
            return 'TD' # Default to TD if unknown
        return v

    @validator('day')
    def normalize_day(cls, v):
        if not v: return None
        v = v.strip().capitalize()
        days_map = {
            'Lundi': 'LUNDI', 'Mardi': 'MARDI', 'Mercredi': 'MERCREDI',
            'Jeudi': 'JEUDI', 'Vendredi': 'VENDREDI', 'Samedi': 'SAMEDI'
        }
        return days_map.get(v, v.upper())

    @validator('module', 'teacher', 'section')
    def clean_strings(cls, v):
        if not v: return v
        # Removes extra interior spaces and trims
        import re
        v = re.sub(r'\s+', ' ', v).strip()
        return v
