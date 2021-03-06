/* Crypton Server, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Server.
 *
 * Crypton Server is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Server is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Server.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var app = process.app;
var db = app.datastore;
var middleware = require('../lib/middleware');
var Account = require('../lib/account');

/**!
 * ### POST /account
 * Translate posted body to an account object,
 * hashe and delete `account.challengeKey`,
 * then save the resulting account object to the server
*/
app.post('/account', function (req, res) {
  app.log('debug', 'handling POST /account');

  var account = new Account();
  var challengeKey = req.body.challengeKey;
  account.update(req.body);

  account.hashChallengeKey(challengeKey, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
    }

    account.save(function (err) {
      if (err) {
        res.send({
          success: false,
          error: err
        });

        return;
      }

      res.send({
        success: true
      });
    });
  });
});

/**!
 * ### POST /account/:username
 * Retrieve account belonging to `username`,
 * send challengeKeySalt so client can generate
 * a challengeKeyReponse
*/
// TODO this could just be a GET?
app.post('/account/:username', function (req, res) {
  app.log('debug', 'handling POST /account/:username');

  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      app.log('debug', 'could not get account for ' + req.params.username);
      res.send({
        success: false,
        error: err
      });

      return;
    }

    res.send({
      success: true,
      challengeKeySalt: account.challengeKeySalt
    });
  });
});

/**!
 * ### POST /account/:username/answer
 * Retrieve account belonging to `username`,
 * verify that posted challengeKeyReponse matches
 * stored challengeKeyHash.
 * If successful, start a session.
*/
app.post('/account/:username/answer', function (req, res) {
  app.log('debug', 'handling POST /account/:username/answer');

  var challengeKeyResponse = req.body.challengeKey;
  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }

    if (typeof challengeKeyResponse != 'string') {
      app.log('debug', 'challengeKeyResponse was not string');
      challengeKeyResponse = JSON.stringify(challengeKeyResponse);
    }

    account.verifyChallenge(challengeKeyResponse, function (err) {
      if (err) {
        app.log('debug', 'challenge verification failed: ' + err);
        res.send({
          success: false,
          error: err
        });

        return;
      }

      app.log('debug', 'challenge verification succcess');
      req.session.accountId = account.accountId;

      res.send({
        success: true,
        account: account.toJSON(),
        sessionIdentifier: req.sessionID
      });
    });
  });
});

/**!
 * ### POST /account/:username/keyring
 * Placeholder route for posting regenerated
 * keyring data after a password change
*/
// TODO implement this!
app.post('/account/:username/keyring',
  middleware.verifySession,
  function (req, res) {
    app.log('debug', 'handling POST /account/:username/keyring');
    res.send({
      success: true
    });
  }
);
