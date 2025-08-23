"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 mt-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        {/* Left side */}
        <p className="text-sm">
          © 2025 Green-AI Team | Developer: Omar Elbedawy
        </p>

        {/* Right side */}
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link
            href="/about"
            className="hover:underline text-sm"
          >
            About Us
          </Link>

          <Link
            href="/contact"
            className="hover:underline text-sm"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  );
}
