import HtmlPlugin from "html-webpack-plugin"
import CopyPlugin from "copy-webpack-plugin"

export const cache = false
export const entry = {
    content: "./src/js/content-main.js",
    worker: "./src/js/worker-main.js",
    popup: "./src/js/popup-main.jsx",
    options: "./src/js/options-main.jsx"
}
export const output = {
    filename: "[name].js"
}
export const resolve = {
    extensions: ['.js', '.jsx']
}

export const module = {
    rules: [{
        test: /\.js(x)?$/,
        exclude: /node_modules/,
        resolve: {
            fullySpecified: false
        },
        use: {
            loader: "babel-loader",
            options: {
                presets: ["@babel/preset-env", "@babel/preset-react"]
            }
        }
    }]
}
export const plugins = [
    new HtmlPlugin({
        template: "./src/popup.html",
        filename: "popup.html",
        inject: false
    }),
    new HtmlPlugin({
        template: "./src/options.html",
        filename: "options.html",
        inject: false
    }),
    new CopyPlugin({
        patterns: [
            { from: "public" },
        ]
    })
]