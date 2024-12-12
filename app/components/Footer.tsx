
import React from 'react';

export default function Footer() {
  return (
    <footer className=" text-white py-6 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <p className="text-sm mb-2">
          Made with <span className="text-red-500 text-lg">♥</span> by 
          <span className="font-semibold ml-1">Georgina and Cathy</span>
        </p>
        <p className="text-sm mb-2">
          In collaboration with <span className="font-semibold">MIT Media Lab Fluid Interfaces</span>
        </p>
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </footer>
  );
}
