import path from "path";
import CopyPlugin from "copy-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import fs from "fs";
import {Configuration, WebpackPluginInstance} from "webpack";

// Define the source directory
const srcDir = path.resolve(__dirname, "../../../extension");

// Read the package.json for dynamic zip file naming
const packageInfo = JSON.parse(fs.readFileSync("package.json", "utf-8")) as {
  name: string;
  version: string;
};

// Define Webpack configuration
const config: Configuration = {
  entry: {
    popup: path.join(srcDir, "popup.tsx"),
    options: path.join(srcDir, "options.tsx"),
    background: path.join(srcDir, "background.ts"),
    content_script: path.join(srcDir, "content_script.tsx"),
  },
  output: {
    path: path.resolve(__dirname, "../../../../dist"),
    filename: "[name].js",
  },
  optimization: {
    splitChunks: {
      name: "vendor",
      chunks(chunk) {
        return chunk.name !== "background";
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: ".",
          to: path.resolve(__dirname, "../../../../dist"),
          context: "public",
        },
      ],
    }),
    new ZipPlugin({
      path: path.resolve(__dirname, "../../../../dist"),
      filename: `${packageInfo.name}-${packageInfo.version}.zip`,
    }) as WebpackPluginInstance,
  ],
};

export default config;
