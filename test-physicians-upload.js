import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

async function test() {
  try {
    fs.writeFileSync("dummy.png", "dummy image content");
    const formData = new FormData();
    formData.append("files", fs.createReadStream("dummy.png"), "dummy.png");

    const response = await fetch("http://localhost:3000/api/physicians-product-request", {
      method: "POST",
      body: formData,
      headers: {
        // mock auth using the patch I had before... wait, I removed the mock auth!
        // I need a valid token to test, or I can mock the user in the route.
      }
    });
    const result = await response.text();
    console.log(response.status, result);
  } catch(e) {
    console.log(e);
  }
}
test();
