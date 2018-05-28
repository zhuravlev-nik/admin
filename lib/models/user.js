'use strict';

let langId = 'en' // Этого здесь не будет, langId будет храниться в сессии пользователя
const mongoose = require('mongoose');
const crypto = require("crypto");
const lang = reqiure("./lang/"+langId+'/user.js');


let UserSchema = new mongoose.Schema({
  email: { // email пользователя
    type: String,
    unique: true,
    required: [true, lang.errors.emailEmpty],
    validate: {
      validator: function(v) {
        return /^.+@.+$/.test(v);
      },
      message: lang.errors.emailInvalid
    },
  },
  emailLow: { // значение email в нижнем регистре
    type: String
  },
  hashedPassword: { // захешированный пароль пользователя
    type: String,
    required: true
  },
  salt: { // Модификатор для хеширования пароля
    type: String,
    required: true
  },
  created: { // дата создания пользователя
    type: Date,
    default: Date.now
  },
  checkword: { // ключевое слово для смены пароля
    type: String,
    default: null
  },
  active: { // активность пользователя
    type: Boolean,
    default: true
  },
  emailCheckword: {
    type: String,
    default: null
  }
});

UserSchema.virtual('emailConfirmed').get(function() {
  return (this.emailCheckword) ? false : true;
});


// сохранение email в нижнем регистре
UserSchema.pre('save', function(next) {
  this.emailLow = this.email.toLowerCase();
  return next();
});

// метод для регистрации пользователя, 
UserSchema.statics.userRegistration = function(inputData, next) {
  var user;
  var UserModel = this;
  async.series([
    function(_cb) {
      user = new UserModel({
        email: inputData.email,
        emailLow: inputData.email.toLowerCase(),
        password: inputData.password,
        passwordConfirm: inputData.password_confirm
      });
      return _cb();
    },
    function(_cb) {
      user.save(_cb);
    }
  ], function(err) {
    if (err) return next(err);
    return next(null, user);
  });
};

// метод для шифрования пароля
UserSchema.methods.encryptPassword = function(password) {
  return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
};

UserSchema.virtual('password').set(function(password) {
  this._plainPassword = password;
  this.salt = Math.random() + '';
  this.hashedPassword = this.encryptPassword(password);
}).get(function() {
  return this._plainPassword;
});

// геттер/сеттер для подтверждения пароля
UserSchema.virtual('passwordConfirm').set(function(password) {
  this._plainPasswordConfirm = password;
}).get(function() {
  return this._plainPasswordConfirm;
});

// валидация пароля, возвращает ошибку при:
// 1) пароле меньше 6 символов
// 2) несовпадающем пароле с подтверждением пароля
UserSchema.path('hashedPassword').validate(function(v) {
  if (this._plainPassword || this._plainPasswordConfirm) {
    if (this._plainPassword && this._plainPassword.length < 6) {
      this.invalidate('password', lang.errors.passwordInvalid);
    }
    if (this._plainPassword !== this._plainPasswordConfirm) {
      this.invalidate('passwordConfirm', lang.errors.passwordConfirmInvalid);
    }
  }
  if (this.isNew && !this._plainPassword) {
    this.invalidate('password', lang.errors.passwordEmpty);
  }
}, null);

// валидация email, нельзя добавить пользователя с повторяющимся email
UserSchema.path('email').validate(function(v, respond) {
  var self = this;
  var UserModel = self.constructor;
  UserModel.findOne({
    emailLow: self.emailLow
  }, function(err, user) {
    if (user && (self._id.toString() != user._id.toString())) {
      self.invalidate('email', lang.errors.emailBusy);
      return respond(false);
    } else {
      return respond(true);
    }
  });
}, null);

// метод для проверки пароля
UserSchema.methods.checkPassword = function(password) {
  return this.encryptPassword(password) === this.hashedPassword;
};

let UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;

