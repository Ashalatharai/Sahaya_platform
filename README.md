# Sahaya

Sahaya is an accessible-first, warm, and highly legible application designed specifically for Indian senior citizens. It aims to foster trust, reduce loneliness, and provide essential daily assistance through an easy-to-use interface tailored for users with motor and visual age-related declines.

## Features

- **Communities**: Connect with others through tailored groups such as Yoga, Gardening, and Reading.
- **AI Companion**: An integrated AI assistant with Web Speech API support ("Hold to Speak" and "Read Aloud") for easy interaction.
- **Daily Care**: Reminders and trackers for daily health and medication needs.
- **Memory Corner**: A dedicated space to store and revisit cherished memories.
- **Mood Check**: Simple check-ins to track emotional well-being.
- **Emergency SOS**: A highly prominent, always accessible SOS button for immediate assistance.
- **Multilingual Support**: Fully supports English, Kannada, and Hindi to ensure accessibility across different regions.

## Design Philosophy

The interface prioritizes clarity over density and high contrast over subtle aesthetics. It avoids sterile clinical looks, opting instead for an "Organic & Earthy" warmth. 
- **Typography**: Generous sizing (base 18px), high contrast (WCAG AAA compliant), and highly legible fonts (Work Sans, IBM Plex Sans).
- **Interactive Elements**: Large tap targets (minimum 56x56px), distinct hover states, and no complex animations.

## Tech Stack

### Frontend
- **Framework**: React.js (Bootstrapped with Create React App & craco)
- **Styling**: Tailwind CSS with custom earthy, high-contrast themes.
- **UI Components**: Radix UI / Shadcn UI (heavily customized for accessibility)
- **Routing**: React Router
- **Data Fetching**: React Query, Axios
- **Forms**: React Hook Form, Zod

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor / PyMongo)
- **Authentication**: JWT, OAuth (Google), bcrypt
- **Other**: Boto3, Generative AI integration

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- MongoDB

### Running the Backend
1. Navigate to the `backend` directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Start the server (check your server configuration for the exact entry point).

### Running the Frontend
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `yarn install` or `npm install`
3. Start the development server: `npm start`
4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Testing
The project includes a structured testing protocol. Tests are written using `pytest` for the backend and `craco test` for the frontend. See `test_result.md` for the ongoing testing status and agent communication protocol.
