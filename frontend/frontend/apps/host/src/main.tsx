import React from 'react';
import ReactDOM from 'react-dom/client';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactRouterDOM from 'react-router-dom';
import App from './App';
import './styles.css';

(window as any).__MF_REACT__ = React;
(window as any).__MF_REACT_DOM__ = ReactDOM;
(window as any).__MF_REACT_DOM_CLIENT__ = ReactDOMClient;
(window as any).__MF_REACT_ROUTER_DOM__ = ReactRouterDOM;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);