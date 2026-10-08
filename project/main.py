import hashlib
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import Column, Integer, String, URL, create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors


app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_PAGES = {
    "about",
    "add_event",
    "dashboard",
    "user",
    "delete_event",
    "edit_event",
    "events",
    "home",
    "login",
    "logout",
    "register",
    "registered_users",
    "interested_events",
}
FRONTEND_STYLESHEETS = {f"{page}.css" for page in FRONTEND_PAGES}

engine = create_engine(
    URL.create("sqlite", database=str(BASE_DIR / "test.db")),
    connect_args={"check_same_thread": False},
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    data = Column(String, index=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String, index=True)
    event_date = Column(String)
    event_time = Column(String)
    venue = Column(String)
    category = Column(String)
    description = Column(String, default="")
class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer)
    user_email = Column(String)
    competition = Column(String)


Base.metadata.create_all(bind=engine)
with engine.connect() as connection:
    try:
        connection.execute(
            text("ALTER TABLE event_registrations ADD COLUMN competition VARCHAR")
        )
        connection.commit()
    except Exception:
        pass



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
        

class UserCreate(BaseModel):
    username: str
    email: str
    hashed_password: str
    
class UserResponse(BaseModel):
    id: int
    username: str
    email: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class EventCreate(BaseModel):
    event_name: str
    event_date: str
    event_time: str
    venue: str
    category: str
    description: str = ""


class EventResponse(EventCreate):
    id: int


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return f"{salt}${digest.hex()}"


def password_matches(password: str, stored: str) -> bool:
    if "$" not in stored:
        return secrets.compare_digest(password, stored)
    salt, expected = stored.split("$", 1)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return secrets.compare_digest(actual.hex(), expected)
ADMIN_EMAIL = "akshaya9484@gmail.com"


def check_admin(email: str):
    if email != ADMIN_EMAIL:
        raise HTTPException(
            status_code=403,
            detail="Only admin can perform this action"
        )


@app.post("/api/register", response_model=UserResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if (db.query(User).filter(User.email == data.email).first()
            or db.query(User).filter(User.username == data.name).first()):
        raise HTTPException(status_code=400, detail="Name or email is already registered")
    user = User(username=data.name, email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/login", response_model=UserResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not password_matches(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    return user


@app.get("/api/events", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).order_by(Event.event_date, Event.event_time).all()


@app.post("/api/events", response_model=EventResponse)
def create_event(
    data: EventCreate,
    admin_email: str,
    db: Session = Depends(get_db)
):
    check_admin(admin_email)

    event = Event(**data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)

    return event


@app.get("/api/events/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.put("/api/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    data: EventCreate,
    admin_email: str,
    db: Session = Depends(get_db)
):
    check_admin(admin_email)

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in data.model_dump().items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return event

@app.delete("/api/events/{event_id}")
def delete_event(
    event_id: int,
    admin_email: str,
    db: Session = Depends(get_db)
):
    check_admin(admin_email)

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()

    return {"message": "Event deleted"}
@app.post("/api/events/{event_id}/register")
def register_event(
    event_id: int,
    user_email: str,
    competition: str,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    existing = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_email == user_email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already registered for this event"
        )

    registration = EventRegistration(
    event_id=event_id,
    user_email=user_email,
    competition=competition
)

    db.add(registration)
    db.commit()

    return {"message": "Successfully registered for event"}


@app.get("/api/events/{event_id}/registrations")
def get_event_registrations(
    event_id: int,
    admin_email: str,
    db: Session = Depends(get_db)
):
    check_admin(admin_email)

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    registrations = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id
    ).all()

    result = []

    for item in registrations:
        user = db.query(User).filter(
            User.email == item.user_email
        ).first()

        if user:
            result.append({
                "name": user.username,
                "email": user.email,
                "competition": item.competition
            })

    return result
@app.get("/api/interested-events")
def get_interested_events(
    admin_email: str,
    db: Session = Depends(get_db)
):
    check_admin(admin_email)

    registrations = db.query(EventRegistration).all()

    result = []

    for registration in registrations:
        user = db.query(User).filter(
            User.email == registration.user_email
        ).first()

        event = db.query(Event).filter(
            Event.id == registration.event_id
        ).first()

        if user and event:
            result.append({
                "name": user.username,
                "email": user.email,
                "event_name": event.event_name,
                "competition": registration.competition,
                "event_date": event.event_date,
                "event_time": event.event_time,
                "venue": event.venue
            })

    return result


@app.get("/api/events/{event_id}/certificate")
@app.get("/api/events/{event_id}/certificate")
def generate_certificate(
    event_id: int,
    user_email: str,
    admin_email: str,
    db: Session = Depends(get_db)
):
    check_admin(admin_email)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_email == user_email
    ).first()

    if not registration:
        raise HTTPException(
            status_code=404,
            detail="User is not registered for this event"
        )

    certificates_dir = Path("certificates")
    certificates_dir.mkdir(exist_ok=True)

    file_path = certificates_dir / f"{user.username}_certificate.pdf"

    width, height = A4

    pdf = canvas.Canvas(str(file_path), pagesize=A4)

    # Background
    pdf.setFillColor(colors.HexColor("#f8fbff"))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    # Outer border
    pdf.setStrokeColor(colors.HexColor("#1e3a5f"))
    pdf.setLineWidth(5)
    pdf.rect(25, 25, width - 50, height - 50)

    # Inner border
    pdf.setStrokeColor(colors.HexColor("#d4af37"))
    pdf.setLineWidth(2)
    pdf.rect(35, 35, width - 70, height - 70)

    # College Name
    pdf.setFillColor(colors.HexColor("#1e3a5f"))
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(
        width / 2,
        height - 80,
        "Nanjil Catholic College of Arts and Science"
    )

    # Department
    pdf.setFillColor(colors.HexColor("#333333"))
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(
        width / 2,
        height - 108,
        "Department of Computer Science"
    )

    # Certificate title
    pdf.setFillColor(colors.HexColor("#d4af37"))
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(
        width / 2,
        height - 165,
        "CERTIFICATE"
    )

    pdf.setFillColor(colors.HexColor("#1e3a5f"))
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(
        width / 2,
        height - 190,
        "OF PARTICIPATION"
    )

    # Certificate text
    pdf.setFillColor(colors.black)
    pdf.setFont("Helvetica", 13)
    pdf.drawCentredString(
        width / 2,
        height - 240,
        "This certificate is proudly presented to"
    )

    # Student name
    pdf.setFillColor(colors.HexColor("#1e3a5f"))
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawCentredString(
        width / 2,
        height - 280,
        user.username
    )

    # Underline
    pdf.setStrokeColor(colors.HexColor("#d4af37"))
    pdf.setLineWidth(1)
    pdf.line(
        width / 2 - 150,
        height - 288,
        width / 2 + 150,
        height - 288
    )

    # Participation text
    pdf.setFillColor(colors.black)
    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(
        width / 2,
        height - 325,
        "for successfully participating in"
    )

    # Event name
    pdf.setFillColor(colors.HexColor("#1e3a5f"))
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(
        width / 2,
        height - 355,
        event.event_name
    )

    # Competition
    pdf.setFillColor(colors.HexColor("#444444"))
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawCentredString(
        width / 2,
        height - 385,
        f"Competition: {registration.competition}"
    )

    # Date
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(
        width / 2,
        height - 425,
        f"Date: {event.event_date}"
    )

    # Venue
    pdf.drawCentredString(
        width / 2,
        height - 445,
        f"Venue: {event.venue}"
    )

    # Signature
    pdf.setStrokeColor(colors.black)
    pdf.line(80, 90, 220, 90)
    pdf.setFont("Helvetica", 10)
    pdf.drawCentredString(150, 75, "Event Coordinator")

    pdf.line(width - 220, 90, width - 80, 90)
    pdf.drawCentredString(width - 150, 75, "Head of the Department")

    # Footer
    pdf.setFillColor(colors.HexColor("#1e3a5f"))
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawCentredString(
        width / 2,
        50,
        "Department of Computer Science"
    )

    pdf.save()

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=f"{user.username}_certificate.pdf"
    )

@app.post("/users/create/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(username=user.username, email=user.email, hashed_password=user.hashed_password)
    if (db.query(User).filter(User.username == user.username).first() 
                        or 
        db.query(User).filter(User.email == user.email).first()):
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/", response_model=list[UserResponse])
def users(db: Session = Depends(get_db)):
    db_user = db.query(User).all()
    return db_user


@app.get("/users/{user_id}/", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post("/users/login/", response_model=UserResponse)
def login_user(username: str, password: str, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == username).first()
    if not db_user or db_user.hashed_password != password:
        raise HTTPException(status_code=400, detail="Invalid username or password")
    return db_user


class ItemCreate(BaseModel):
    title: str
    data: str


class ItemResponse(BaseModel):
    id: int
    title: str
    data: str


# -------------------------
# CREATE
# -------------------------

@app.post("/items/", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):

    db_item = Item(
        title=item.title,
        data=item.data
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


# -------------------------
# READ ALL
# -------------------------

@app.get("/items/", response_model=list[ItemResponse])
def get_items(db: Session = Depends(get_db)):

    items = db.query(Item).all()

    return items


# -------------------------
# READ ONE
# -------------------------

@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):

    item = db.query(Item).filter(Item.id == item_id).first()

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    return item


# -------------------------
# UPDATE
# -------------------------

@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    item_data: ItemCreate,
    db: Session = Depends(get_db)
):

    item = db.query(Item).filter(Item.id == item_id).first()

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    item.title = item_data.title
    item.data = item_data.data

    db.commit()
    db.refresh(item)

    return item


# -------------------------
# DELETE
# -------------------------

@app.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db)
):

    item = db.query(Item).filter(Item.id == item_id).first()

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    db.delete(item)
    db.commit()

    return {
        "message": "Item deleted successfully"
    }


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(BASE_DIR / "home.html")


@app.get("/app.js", include_in_schema=False)
def frontend_script():
    return FileResponse(BASE_DIR / "app.js", media_type="text/javascript")


@app.get("/{stylesheet_name}.css", include_in_schema=False)
def frontend_stylesheet(stylesheet_name: str):
    filename = f"{stylesheet_name}.css"
    if filename not in FRONTEND_STYLESHEETS:
        raise HTTPException(status_code=404, detail="Stylesheet not found")
    stylesheet = BASE_DIR / filename
    if not stylesheet.is_file():
        raise HTTPException(status_code=404, detail="Stylesheet not found")
    return FileResponse(stylesheet, media_type="text/css")


@app.get("/{page_name}.html", include_in_schema=False)
def frontend_page(page_name: str):
    if page_name not in FRONTEND_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    page = BASE_DIR / f"{page_name}.html"
    if not page.is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(page)
    