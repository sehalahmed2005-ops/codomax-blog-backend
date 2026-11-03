# Inkwell Blog Backend (Module 03: Database Integration)

Node.js + Express + MongoDB (Mongoose) backend for the Inkwell blog app.

## Features
- User registration and login (bcrypt password hashing, JWT)
- MongoDB storage for users and blog posts
- Public API to list all blogs and view a single blog
- Create, edit and delete blogs (owner only)

## Setup
1. Install MongoDB locally or use MongoDB Atlas
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the values
4. `npm run dev`

## API
- POST /api/auth/register
- POST /api/auth/login
- GET /api/blogs
- GET /api/blogs/:id
- GET /api/blogs/mine (login required)
- POST /api/blogs (login required)
- PUT /api/blogs/:id (owner only)
- DELETE /api/blogs/:id (owner only)