const express = require('express');

// 1. Import Repository, Factory Service, dan Factory Controller
const AuthRepository = require('./auth.repository');
const createAuthService = require('./auth.service');
const createAuthController = require('./auth.controller');

const {
  validateSignup,
  validateLogin,
  validateSendOtp,
  validateVerifyOtp,
  validateRefresh,
  validateLogout,
} = require('./auth.validator');
const authenticate = require('../../shared/middlewares/authenticate');


// 2. PROSES LEVELING DI (Dependency Injection)
// 2.1. Inject AuthRepository ke dalam AuthService
const authService = createAuthService(AuthRepository);


// 2.2. Inject authService yang sudah diinject repository ke dalam AuthController
const authController = createAuthController(authService);

const router = express.Router();

//3. Pasang Route EndPoint
// middleware
router.post('/signup', validateSignup, authController.signup);

module.exports = router;