import express from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { addServicePrice } from "./servicePrice.controller";

const route = express.Router();

route.post("/add-service-price", guardRole(["trainer"]), addServicePrice);
