# Module 1 Group Assignment

CSCI 5117, Fall 2026, [assignment description](https://canvas.umn.edu/courses/579310/pages/project-1)

## App Info:

* Team Name: The Style Sheet Skinks
* App Name: GeoBloggr
* App Link: https://developing-the-interactive-web-project-1-iwci.onrender.com

### Students

* Han Tran, tran1229@umn.edu
* Brady Kloek, kloek016@umn.edu
* Amara Marx, marx0109@umn.edu
* Sarah Wood, wood1532@umn.edu
* Zoe Berrier, berri075@umn.edu


## Key Features

**Describe the most challenging features you implemented
(one sentence per bullet, maximum 4 bullets):**

* Handling image uploads from users, storing images, and displaying images.
* Creating popups, structuring the layout so popups appear on top of the map and not under it.
* Location-based searching and advanced filtering of posts by keyword, location, user, and date.

## Testing Notes

**Is there anything special we need to know in order to effectively test your app? (optional):**

* If testing locally, not on Render, ensure that the Postgres application is installed. PGAdmin4 alone will not work with PostGIS.


## Screenshots of Site

**[Add a screenshot of each key page (around 4)](https://stackoverflow.com/questions/10189356/how-to-add-screenshot-to-readmes-in-github-repository)
along with a very brief caption:**

![image of GeoBloggr Map Page](/screenshots/map-page.png?raw=true)
This is the main map layout of the website, which displays posts by their chosen pin icon.

![image of GeoBloggr Post Pop-Up](/screenshots/create-post.png?raw=true)
This is the popup displayed to users when they wish to create a post from the map page. They may add a title, description, image, and custom icon, as well as select if the post should be anonymized.

![image of GeoBloggr Blog Page](/screenshots/blog-page.png?raw=true)
This is the main blog-style layout of the website, which supports both a grid and collapsed view. Users may filter by keyword search, location, user, and date.

![image of GeoBloggr Post Page](/screenshots/post-page.png?raw=true)
This is an individual post page (zoomed out to see larger set of features). Users can leave comments to react. If a user is signed in and viewing their own post, they may edit and delete.

## Mock-up 

There are a few tools for mock-ups. Paper prototypes (low-tech, but effective and cheap), Digital picture edition software (gimp / photoshop / etc.), or dedicated tools like moqups.com (I'm calling out moqups here in particular since it seems to strike the best balance between "easy-to-use" and "wants your money" -- the free teir isn't perfect, but it should be sufficient for our needs with a little "creative layout" to get around the page-limit)

In this space please either provide images (around 4) showing your prototypes, OR, a link to an online hosted mock-up tool like moqups.com

**[Add images/photos that show your paper prototype (around 4)](https://stackoverflow.com/questions/10189356/how-to-add-screenshot-to-readmes-in-github-repository) along with a very brief caption:**

![Image of low-fidelity MapBlog mockups created in Miro, a whiteboarding app](MapBlog-Mockup.jpg?raw=true)
A single high-quality image capturing the entirety of the low-fidelity MapBlog mockup for your convenience. We encourage our dear grader to click into this image to zoom and explore! Alternatively, follow this [Miro Link](https://miro.com/app/board/uXjVHjkKJXM=/?share_link_id=116152954478) which theoretically should allow you to view our Miro whiteboard for additional zooming fun.


## External Dependencies

**Document integrations with 3rd Party code or services here.
Please do not document required libraries. or libraries that are mentioned in the product requirements**

* Library or service name: description of use
* Leaflet: Lightweight open source mapping library. The mapping library provides utilities to add maps to the webpage and interact with the map.
* PostGIS: Open source software that extends the capabilities of the Postgres relational database. Adds support for storing, indexing, and querying geospatial data.
* Font Awesome: Library to get search icon
* [Emoji Mart](https://github.com/missive/emoji-mart): Library for emoji picker for selectable map icons


**If there's anything else you would like to disclose about how your project
relied on external code, expertise, or anything else, please disclose that
here:**

...
