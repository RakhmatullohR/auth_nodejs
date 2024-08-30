const express = require('express');
require('dotenv').config();
const Datastore = require('nedb-promises');
const bcrypt = require('bcryptjs');
const responseCreator = require('./utils/responseCreator');
const jwt = require('jsonwebtoken');
const { accessTokenSecret } = require('./config');
const { PORT, ACCESS_TOKEN_SECRET } = process.env;

// Initialize express
const app = express();

// Configure body parser
app.use(express.json());
const users = Datastore.create('Users.json');
app.get('/', (req, res) => {
  res.send('REST API Authentication and Authorization');
});
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json(
        responseCreator({
          success: false,
          message: 'Please fill in all fields (name, email, password)',
        })
      );
    }
    if (await users.findOne({ email })) {
      return res.status(409).json(
        responseCreator({
          success: false,
          message: 'Email already exists',
        })
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await users.insert({
      name,
      email,
      password: hashedPassword,
      role: role ?? 'member',
    });
    return res.status(201).json(
      responseCreator({
        success: true,
        message: 'User registered successfully',
        meta: { id: newUser._id },
      })
    );
  } catch (error) {
    console.log(JSON.stringify(error));
    return res.status(error.code || error.statusCode || 500).json(
      responseCreator({
        success: false,
        message: error?.message,
        errorName: error?.name,
      })
    );
  }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json(
        responseCreator({
          success: false,
          message: 'Please fill in all fields (name and password)',
        })
      );
    }
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(401).json(
        responseCreator({
          success: false,
          message: 'Email or password is invalid',
        })
      );
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json(
        responseCreator({
          success: false,
          message: 'Email or password is invalid',
        })
      );
    }

    const accessToken = jwt.sign(
      { jwtUserId: user?._id, subject: 'accessApiaaaaa' },
      ACCESS_TOKEN_SECRET,
      {
        subject: 'accessApi',
        expiresIn: '4h',
      }
    );

    return res.status(200).json(
      responseCreator({
        success: true,
        message: 'User loged in successfully',
        meta: {
          id: user?._id,
          name: user?.name,
          email: user?.email,
          accessToken,
        },
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(error.code || error.statusCode || 500)
      .json(responseCreator({ success: false, message: error.message }));
  }
});

app.get('/api/users/current', ensureAuthenticated, async (req, res) => {
  try {
    const user = await users?.findOne({ _id: req.accessedUser?.jwtUserId });
    if (!user) {
      return res.status(401).json(
        responseCreator({
          success: false,
          message: 'This user is not found',
        })
      );
    }
    return res.status(200).json(
      responseCreator({
        success: true,
        message: 'Current user data',
        meta: {
          id: user?._id,
          name: user?.name,
          email: user?.email,
        },
      })
    );
  } catch (error) {
    console.log(JSON.stringify(error));
    return res.status(error.code || error.statusCode || 500).json(
      responseCreator({
        success: false,
        message: error?.message,
        errorName: error?.name,
      })
    );
  }
});

app.get(
  '/api/admin',
  ensureAuthenticated,
  authorize(['admin']),
  async (req, res) => {
    return res.status(200).json(
      responseCreator({
        success: true,
        message: 'Only admins can access this route!',
      })
    );
  }
);
app.get(
  '/api/moderator',
  ensureAuthenticated,
  authorize(['admin', 'moderator']),
  async (req, res) => {
    return res.status(200).json(
      responseCreator({
        success: true,
        message: 'Only admins and moderators can access this route!',
      })
    );
  }
);

async function ensureAuthenticated(req, res, next) {
  const accessToken = req.headers.authorization;

  if (!accessToken) {
    return res.status(401).json({ message: 'Access token not found' });
  }
  try {
    const decodedAccessToken = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    console.log(decodedAccessToken);
    console.log(new Date(decodedAccessToken?.iat * 1000).toLocaleString()); // Output in ISO 8601 format
    console.log(new Date(decodedAccessToken?.exp * 1000).toLocaleString()); // Output in ISO 8601 format
    req.accessedUser = { jwtUserId: decodedAccessToken?.jwtUserId };
    console.log(req?.accessedUser);
    next();
  } catch (error) {
    console.log(JSON.stringify(error));
    return res.status(error.code || error.statusCode || 500).json(
      responseCreator({
        success: false,
        message: error?.message,
        errorName: error?.name,
      })
    );
  }
}
function authorize(roles = []) {
  return async function (req, res, next) {
    const user = await users?.findOne({ _id: req.accessedUser?.jwtUserId });
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json(
        responseCreator({
          success: false,
          message: 'Access deini',
        })
      );
    }
    try {
      next();
    } catch (error) {
      console.log(JSON.stringify(error));
      return res.status(error.code || error.statusCode || 500).json(
        responseCreator({
          success: false,
          message: error?.message,
          errorName: error?.name,
        })
      );
    }
  };
}

app.listen(PORT, () => {
  console.log(`Server started on port http://localhost:${PORT}`);
});
