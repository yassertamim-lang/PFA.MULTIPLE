
- POST `/api/users` {name,age} → {"id":int,"name",...} (name unique)
- GET `/api/scores/:id` → [{score,int percentage,date}]
- POST `/api/scores` {userId,score,percentage} 

## Implementation Steps
1. **✅ Create this TODO.md**

2. **✅ app.py** - Full Flask + SQLite game.db (users/scores tables)

3. **✅ script.js** - API_BASE = '/api' (relative → port 5000)

4. **Setup**: `pip install flask flask-cors`, `python app.py`

5. **Test**: Open index.html (Live Server) → sign-in/play → scores persist in game.db

6. **✅ Complete** 🎉

**To switch to Python backend:**
```
pip install flask flask-cors
python app.py  # port 5000
# Open index.html in Live Server (works relative /api)
```

game.db created automatically. No MySQL needed!
