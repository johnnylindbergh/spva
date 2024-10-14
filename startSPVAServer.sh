#!/bin/sh
serviceman start spvaTrack
sudo journalctl -xef --unit spvaTrack 
