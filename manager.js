"use strict";

var Manager = module.exports;
var db = {};

Manager.create = function(opts) {
    var manager = {};

    //
    // REQUIRED (basic issuance)
    //

    // Get
    manager.get = async function({ servername, wildname }) {
        // Required: find the certificate with the subject of `servername`
        // Optional (multi-domain certs support): find a certificate with `servername` as an altname
        // Optional (wildcard support): find a certificate with `wildname` as an altname

        // { subject, altnames, renewAt, deletedAt, challenges, ... }
        return db[servername] || db[wildname];
    };

    // Set
    manager.set = async function(opts) {
        // { subject, altnames, renewAt, deletedAt }
        // Required: updated `renewAt` and `deletedAt` for certificate matching `subject`

        var site = db[opts.subject] || {};
        db[opts.subject] = Object.assign(site, opts);
        return null;
    };

    //
    // Optional (Fully Automatic Renewal)
    //
    /*
    manager.find = async function(opts) {
        // { subject, servernames, altnames, renewBefore }

        return [{ subject, altnames, renewAt, deletedAt }];
    };
    //*/

    //
    // Optional (Special Remove Functionality)
    // The default behavior is to set `deletedAt`
    //
    /*
    manager.remove = async function(opts) {
    	return mfs.remove(opts);
    };
    //*/

    //
    // Optional (special settings save)
    // Implemented here because this module IS the fallback
    //
    /*
    manager.defaults = async function(opts) {
        if (opts) {
            return setDefaults(opts);
        }
        return getDefaults();
    };
    //*/

    //
    // Optional (for common deps and/or async initialization)
    //
    /*
    manager.init = async function(deps) {
        manager.request = deps.request;
        return null;
    };
    //*/

    return manager;
};
