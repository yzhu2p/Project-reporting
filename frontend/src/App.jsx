import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BackorderReport from './components/BackorderReport';
import ProjectCosting from './components/ProjectCosting';
import CustomerPOs from './components/CustomerPOs';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  // Apply dark mode class to root HTML element when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <Layout theme={theme} setTheme={setTheme}>
      <Routes>
        <Route path="/backorders" element={<BackorderReport />} />
        <Route path="/backorders/:orderNumberParam" element={<BackorderReport />} />
        <Route path="/costing" element={<ProjectCosting />} />
        <Route path="/costing/:orderNumberParam" element={<ProjectCosting />} />
        <Route path="/customer-pos" element={<CustomerPOs />} />
        <Route path="*" element={<Navigate to="/backorders" replace />} />
      </Routes>
    </Layout>
  );
}
