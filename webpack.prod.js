import { merge } from "webpack-merge"
import * as config from "./webpack.config.js"

export default merge(config, {
    mode: "production"
})