-- SQL Script for Multiplication Game Database
-- Created for MySQL Workbench

-- Create database
CREATE DATABASE IF NOT EXISTS pfa_multp;
USE pfa_multp;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    age INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    date_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample data (optional)
-- INSERT INTO users (name, age) VALUES ('TestUser', 10);
-- INSERT INTO scores (user_id, score, percentage) VALUES (1, 100, 100.00);