# Inkwell Blog Backend

REST API for the Inkwell blog application, built with Node.js and Express.

## Features
- User registration and login (JWT authentication, bcrypt password hashing)
- Create, read, edit and delete blog posts
- Only the post owner can edit or delete a post

## Setup
1. Run `npm install`
2. Create a `.env` file with `PORT=5000` and `JWT_SECRET=your_secret_here`
3. Run `npm start`

Server runs at http://localhost:5000

## API Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Register a user |
| POST | /api/auth/login | No | Login, returns token |
| GET | /api/blogs | No | List all blogs |
| GET | /api/blogs/mine | Yes | List my blogs |
| GET | /api/blogs/:id | No | Get one blog |
| POST | /api/blogs | Yes | Create a blog |
| PUT | /api/blogs/:id | Yes | Edit my blog |
| DELETE | /api/blogs/:id | Yes | Delete my blog |

## Frontend
https://github.com/sehalahmed2005-ops/codomax-blog-frontend
