import React from 'react';
import UploadForm from './components/UploadForm';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Video Hosting</h1>
        <p>Загрузите ваше видео</p>
      </header>
      <main>
        <UploadForm />
      </main>
    </div>
  );
}

export default App;