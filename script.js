
let x2js = new X2JS();

//----------------------------------------------------------------------
let retrieveAllData = () => {
    //1) Get user Latitude and Longitude and pass to #2.
    if (navigator.geolocation) { 
        navigator.geolocation.getCurrentPosition(retrieveUserDistrictDataFromCoords, ()=>{
            console.log("Location services not available. Please try again later.");
        });      
    } else {
        console.log("This browser does not support location services.");
    }
}
let retrieveUserDistrictDataFromCoords = (position) => {
    //2) Using Latitude and Longitude and geocod.io API, get user's current district data.
    let addressResultsAccuracyRatings = [];
    axios.get(`https://api.geocod.io/v1.3/reverse?q=${position.coords.latitude},${position.coords.longitude}&fields=cd&api_key=${geocodioAPIKey}`)
        .then((response)=> {
            console.log("RETRIEVED USER GEOPOL DATA BASED ON COORDINATES------------------------------");
            for (let x = 0; x < response.data.results.length; x++) {
                addressResultsAccuracyRatings.push(response.data.results[x].accuracy);
            }
            userGeneralPoliticalGeoData = response.data.results[addressResultsAccuracyRatings.indexOf(Math.max(...addressResultsAccuracyRatings))];
            for (let x = 0; x < userGeneralPoliticalGeoData.fields.congressional_districts[0].current_legislators.length; x++) {
                if (userGeneralPoliticalGeoData.fields.congressional_districts[0].current_legislators[x].type === "representative") {
                    userHouseRepProfile = userGeneralPoliticalGeoData.fields.congressional_districts[0].current_legislators[x];
                    userHouseRepProfile.bio.img = `https://theunitedstates.io/images/congress/original/${userHouseRepProfile.references.bioguide_id}.jpg`;
                    userHouseRepProfile.bio.age = parseInt((currentDate.getFullYear())) - parseInt((new Date(userHouseRepProfile.bio.birthday)).getFullYear());
                    console.log(userGeneralPoliticalGeoData);
                    console.log("-----------------------------------------------------------------------------");
                    console.log("RETRIEVED INITIAL USER HOUSE REP PROFILE-------------------------------------");
                    console.log(userHouseRepProfile);
                    console.log("-----------------------------------------------------------------------------");
                }
            }
            retrieveUserHouseRepCommAppt();
        })
        .catch((error)=> {
            console.log("FAILED AT retrieveUserDistrictDataFromCoords");
            console.log(error);
    });
}


let retrieveUserHouseRepCommAppt = () => {
    axios.get(`https://theunitedstates.io/congress-legislators/committee-membership-current.json`)
        .then((response)=> {
            console.log("RETRIEVED USER HOUSE REP COMMITTEE APPOINTMENT SHORTNAMES--------------------");
            let committeeApptsWithShortNames = [];
            for (let x in response.data) {
                for (let y = 0; y < response.data[x].length; y++) {
                    if (response.data[x][y].bioguide === userHouseRepProfile.references.bioguide_id) {
                        let committeeAppt = response.data[x][y];
                        committeeAppt.comittee_thomas_id = x;
                        committeeAppt.subcomitteesRepIsIn = [];
                        committeeApptsWithShortNames.push(committeeAppt);
                        continue;
                    }
                }
            }
            userHouseRepProfile.committee_appts = committeeApptsWithShortNames;
            let indexToRemoveSubcomittees = [];
            for (let x = 0; x < userHouseRepProfile.committee_appts.length; x++) {
                for (let y = 0; y < userHouseRepProfile.committee_appts.length; y++) {
                    if (x !== y && userHouseRepProfile.committee_appts[x].comittee_thomas_id.length === 4) {
                        if (userHouseRepProfile.committee_appts[y].comittee_thomas_id.slice(0,4) === userHouseRepProfile.committee_appts[x].comittee_thomas_id) {
                            if (userHouseRepProfile.committee_appts[y].title === "undefined") {
                                userHouseRepProfile.committee_appts[y].title = "none";
                            }
                            userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn.push({subcommittee_thomas_id: userHouseRepProfile.committee_appts[y].comittee_thomas_id, rank: userHouseRepProfile.committee_appts[y].rank, title: userHouseRepProfile.committee_appts[y].title});
                            indexToRemoveSubcomittees.push(y);
                        }
                    }
                }
            }
            while(indexToRemoveSubcomittees.length) {
                userHouseRepProfile.committee_appts.splice(indexToRemoveSubcomittees.pop(), 1);
            }
            console.log(userHouseRepProfile);
            console.log("-----------------------------------------------------------------------------");
            retrieveUserHouseRepCommApptText();
        })
        .catch((error)=> {
            console.log("FAILED AT retrieveUserHouseRepCommAppt");
            console.log(error);
    });
}

let retrieveUserHouseRepCommApptText = () => {
    axios.get(`https://theunitedstates.io/congress-legislators/committees-current.json`)
        .then((response)=> {
            console.log("RETRIEVED USER HOUSE REP COMMITTEE APPOINTMENT LONGNAMES--------------------"); 
            for (let x = 0; x < response.data.length; x++) {
                for (let y = 0; y < userHouseRepProfile.committee_appts.length; y++) {
                    if (response.data[x].thomas_id === userHouseRepProfile.committee_appts[y].comittee_thomas_id) {
                        userHouseRepProfile.committee_appts[y].committee_info = response.data[x];
                    }
                } 
            } 
            for (let a = 0; a < userHouseRepProfile.committee_appts.length; a++) {
                for (let b = 0; b < userHouseRepProfile.committee_appts[a].subcomitteesRepIsIn.length; b++) {
                    for (let c = 0; c < userHouseRepProfile.committee_appts[a].committee_info.subcommittees.length; c++) { 
                        if (userHouseRepProfile.committee_appts[a].committee_info.subcommittees[c].thomas_id === userHouseRepProfile.committee_appts[a].subcomitteesRepIsIn[b].subcommittee_thomas_id.slice(4)) {
                            userHouseRepProfile.committee_appts[a].subcomitteesRepIsIn[b].subcomittee_info = userHouseRepProfile.committee_appts[a].committee_info.subcommittees[c];
                        }
                    }
                }
            }
            console.log(userHouseRepProfile);
            console.log("-----------------------------------------------------------------------------");
            getNextCandidatesFromDistrict();
        })
        .catch((error)=> {
            console.log("FAILED AT retrieveUserHouseRepCommApptText");
            console.log(error);
    });
}
let getNextCandidatesFromDistrict = () => {
    //this returns depending on year candidates in a certain year
    //i should search by elections and find if current year or current year + 1 will yield
    let districtNum;
    if (userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number < 10) {
        districtNum = "0" + userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number;
    }
    else {
        districtNum = userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number; 
    }
    axios.get(`https://api.open.fec.gov/v1/candidates/?year=${currentDate.getFullYear()}&district=${districtNum}&sort=name&page=1&election_year=${currentDate.getFullYear()}&api_key=${fecAPIKey}&state=${userGeneralPoliticalGeoData.address_components.state}&office=H&per_page=100`)
        .then((response)=> {
            console.log("RETRIEVED CANDIDATES FROM DISTRICT-------------------------------------------");
            nextCandidates = response;
            console.log(nextCandidates);
            console.log("-----------------------------------------------------------------------------");
            getNextElectionsFromDistrict();
        })
        .catch((error)=> {
            console.log("FAILED AT getNextCandidatesFromDistrict");
            console.log(error);
    });
}
let getNextElectionsFromDistrict = () => {
    axios.get(`https://api.open.fec.gov/v1/election-dates/?office_sought=H&sort=-election_date&election_state=${userGeneralPoliticalGeoData.address_components.state}&page=1&election_year=${currentDate.getFullYear()}&api_key=${fecAPIKey}&per_page=100`)
        .then((response)=> {
            console.log("RETRIEVED ELECTIONS FROM DISTRICT-------------------------------------------------");
            nextElections = response.data;
            console.log(nextElections);
            console.log("-----------------------------------------------------------------------------");
            
            getNextElectionsByZipForElectionId();
        })
        .catch((error)=> {
            console.log("FAILED AT getNextElectionsFromDistrict");
            console.log(error);
    });
}

let getNextElectionsByZipForElectionId = () => {
    axios.get(`https://api.votesmart.org/Election.getElectionByZip?key=b331f600a4dc88328ba16a62b5b5b20e&candidateId=9490&zip5=${userGeneralPoliticalGeoData.address_components.zip}`)
    .then((response)=> {
        console.log("RETRIEVED ELECTIONS FROM ZIP (VOTESMART)-------------------------------------");
        electionVoteSmartIds = x2js.xml_str2json(response.data);
        console.log(electionVoteSmartIds);
        getPrimaryResults();
        console.log("-----------------------------------------------------------------------------");
    })
    .catch((error)=> {
        console.log("FAILED AT getNextElectionsByZipForElectionId");
        console.log(error);
    });
}


let getPrimaryResults = () => {
    axios.get(`https://api.votesmart.org/Election.getStageCandidates?key=b331f600a4dc88328ba16a62b5b5b20e&electionId=${electionVoteSmartIds.elections.election[0].electionId}&stageId=P`)
    .then((response)=> {
        console.log("RETRIEVED ELECTIONS PRIMARY RESULTS-------------------------------------------");
        console.log("RAW");
        console.log(x2js.xml_str2json(response.data));
        let rawCandidates = x2js.xml_str2json(response.data);
        districtCandidatesPrimary = x2js.xml_str2json(response.data);
        districtCandidatesPrimary.stageCandidates.candidate = [];
        for (let x = 0; x < rawCandidates.stageCandidates.candidate.length; x++) {
            if (rawCandidates.stageCandidates.candidate[x].district === userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number.toString()) {
                districtCandidatesPrimary.stageCandidates.candidate.push(rawCandidates.stageCandidates.candidate[x]);
            }
        }
        
        getGeneralResults();
        console.log("CLEAN");
        console.log(districtCandidatesPrimary);
        console.log("-----------------------------------------------------------------------------");
    })
    .catch((error)=> {
        console.log("FAILED AT getPrimaryResults");
        console.log(error);
    });
}

let getGeneralResults = () => {
    axios.get(`https://api.votesmart.org/Election.getStageCandidates?key=b331f600a4dc88328ba16a62b5b5b20e&electionId=${electionVoteSmartIds.elections.election[0].electionId}&stageId=G`)
    .then((response)=> {
        console.log("RETRIEVED ELECTIONS GENERAL RESULTS------------------------------------------");
        console.log("RAW");
        console.log(x2js.xml_str2json(response.data));
        let getGeneralRunners = x2js.xml_str2json(response.data);
        let candidatesGeneral = [];
        for (let x = 0; x < getGeneralRunners.stageCandidates.candidate.length; x++) {
            if (getGeneralRunners.stageCandidates.candidate[x].district === userGeneralPoliticalGeoData.fields.congressional_districts[0].district_number.toString()) {
                candidatesGeneral.push(getGeneralRunners.stageCandidates.candidate[x]);
            }
        }
        getGeneralRunners.stageCandidates.candidate = candidatesGeneral;
        console.log("CLEAN");
        console.log(getGeneralRunners);
        districtCandidatesGeneral = getGeneralRunners;
        writeBasic();
        console.log("-----------------------------------------------------------------------------");
    })
    .catch((error)=> {
        console.log("FAILED AT getGeneralResults");
        console.log(error);
    });
}












let xmlToJson = (xml) => {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};

let writeBasic = () => {
    document.getElementById("loading").parentElement.removeChild(document.getElementById("loading"));
    document.getElementById("yourCurrentRepName").innerHTML= `<a href = '${userHouseRepProfile.contact.url}'>${userHouseRepProfile.bio.first_name} ${userHouseRepProfile.bio.last_name}</a>`;
    document.getElementById("yourCurrentRepJurisdiction").innerText= `(${userHouseRepProfile.bio.party} - ${userGeneralPoliticalGeoData.address_components.state})`;
    document.getElementById("yourCurrentRepDistrict").innerText= `${userGeneralPoliticalGeoData.fields.congressional_districts[0].name}`;
    document.getElementById("yourCurrentRepOfficeAndPhone").innerHTML= `DC OFFICE: <br>${userHouseRepProfile.contact.address}<br>${userHouseRepProfile.contact.phone}`;
    document.getElementById("yourCurrentRepOfficeAndPhone").style.textAlign = "center";
    document.getElementById("yourCurrentRepPic").src = `${userHouseRepProfile.bio.img}`;
    let divider1 = document.createElement("div");
    divider1.classList.add("divider");
    document.getElementById("main").insertBefore(divider1, document.getElementById("yourCurrentRepCommitteeAppts"));

    
    document.getElementById("yourCurrentRepCommitteeAppts").innerHTML = `COMMITTEE APPOINTMENTS [${userHouseRepProfile.committee_appts.length}]:`;
    for (let x = 0; x < userHouseRepProfile.committee_appts.length; x++) {
        let committee = document.createElement("h2");
        committee.innerHTML = `<a href = '${userHouseRepProfile.committee_appts[x].committee_info.jurisdiction_source}'>${userHouseRepProfile.committee_appts[x].committee_info.name} - Rank: ${userHouseRepProfile.committee_appts[x].rank}</a>`;
        document.getElementById("main").appendChild(committee);
        let committeeSummary = document.createElement("h3");
        committeeSummary.classList.add("summary");
        committeeSummary.innerText = `${userHouseRepProfile.committee_appts[x].committee_info.jurisdiction}`;
        let committeePhone = document.createElement("h3");
        committeePhone.innerText = `${userHouseRepProfile.committee_appts[x].committee_info.phone}`;
        let committeeAddress = document.createElement("h3");
        committeeAddress.innerText = `${userHouseRepProfile.committee_appts[x].committee_info.address}`;
        [committeeSummary, committeePhone, committeeAddress].forEach((element)=>{
            document.getElementById("main").appendChild(element);
        });        
        let subcommitteesList = document.createElement("ul");
        if (userHouseRepProfile.committee_appts[x].rank === 1) {
            let title = document.createElement("li");
            title.innerHTML = "<em>RANKING MEMBER</em>";
            subcommitteesList.appendChild(title);   
        }
        else {
            for (let y = 0; y < userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn.length; y++) {
                let subcommittee = document.createElement("li");
                let title;
                if (userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].title === undefined) {
                    title = "none";
                }
                else {
                    title = userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].title;
                }
                subcommittee.innerHTML = `Subcommittee: ${userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].subcomittee_info.name}<br> Title: ${title}<br> ${userHouseRepProfile.bio.first_name}'s Rank: ${userHouseRepProfile.committee_appts[x].subcomitteesRepIsIn[y].rank}`;
                subcommitteesList.appendChild(subcommittee);
            }
        }
        document.getElementById("main").appendChild(subcommitteesList);
    }
    let divider2 = document.createElement("div");
    divider2.classList.add("divider");
    document.getElementById("main").appendChild(divider2);

    let contactHeader = document.createElement("h1");
    contactHeader.innerText = "SOCIAL MEDIA";
    document.getElementById("main").appendChild(contactHeader);
    let contactList = document.createElement("ul");
    for (let x in userHouseRepProfile.social) {
        if (x.toString() === "rss_url" || x.toString() === "youtube_id") {
            continue;
        }
        let contact = document.createElement("li");
        contact.innerHTML = `<a href = 'http://${x.toString()}.com/${userHouseRepProfile.social[x]}' target = '_blank'>${x.toString().toUpperCase()}</a>`;
        contactList.appendChild(contact)
    } 
    document.getElementById("main").appendChild(contactList);
    let divider3 = document.createElement("div");
    divider3.classList.add("divider");
    document.getElementById("main").appendChild(divider3);


    let nextPrimary = document.createElement("h1");
    let primaryChron = "UPCOMING";
    if (currentDate > Date.parse(nextElections.results[1].election_date)) {
        primaryChron = "PAST";
    }
    nextPrimary.innerText = `${primaryChron} PRIMARY CANDIDATES (${nextElections.results[1].election_date}):`;
    document.getElementById("main").appendChild(nextPrimary);
    let nextList = document.createElement("ul");
    let openSeat = false;
    let toClone = [];
    for (let x = 0; x < nextCandidates.data.results.length; x++) {
        let candidate = document.createElement("li");
        if (nextCandidates.data.results[x].incumbent_challenge_full === "Open seat") {
            openSeat = true;
        }
        if (nextCandidates.data.results[x].incumbent_challenge_full === "Incumbent" && !openSeat) {
            candidate.style.color = "blue";
            candidate.style.backgroundColor = "white";
            candidate.style.borderRadius = "5px";
        }
        if (nextCandidates.data.results[x].incumbent_challenge_full === "Incumbent" && openSeat) {
            candidate.style.color = "white";
            candidate.style.backgroundColor = "red";
            candidate.style.borderRadius = "5px"; 
            nextCandidates.data.results[x].incumbent_challenge_full = "Not running";
        }
        let winStat = "";
        for (let y = 0; y < districtCandidatesPrimary.stageCandidates.candidate.length; y++) {
            if (districtCandidatesPrimary.stageCandidates.candidate[y].lastName.toLowerCase() === nextCandidates.data.results[x].name.replace(",", "").split(" ")[0].toLowerCase() && districtCandidatesPrimary.stageCandidates.candidate[y].status === "Won") {
                winStat = "Status: WON PRIMARY";
                candidate.style.backgroundColor = "green";
                candidate.style.borderRadius = "5px";
                candidate.style.color = "white";
            }
        }
        candidate.innerHTML = `Name: ${nextCandidates.data.results[x].name}<br> Party: ${nextCandidates.data.results[x].party_full}<br> Challenge Status: ${nextCandidates.data.results[x].incumbent_challenge_full}<br> ${winStat}`;
        nextList.appendChild(candidate);
    }
    document.getElementById("main").appendChild(nextList);
    let divider4 = document.createElement("div");
    divider4.classList.add("divider");
    document.getElementById("main").appendChild(divider4);

    let nextGeneral = document.createElement("h1");
    nextGeneral.innerText = `NEXT GENERAL CANDIDATES (${nextElections.results[0].election_date})`;
    document.getElementById("main").appendChild(nextGeneral);


    let nextGeneralList = document.createElement("ul");
    for (let x = 0; x < districtCandidatesGeneral.stageCandidates.candidate.length; x++) {
        console.log(districtCandidatesGeneral.stageCandidates.candidate[x]);
        let candidate = document.createElement("li");
        candidate.innerHTML = `Name: ${districtCandidatesGeneral.stageCandidates.candidate[x].lastName.toUpperCase()}, ${districtCandidatesGeneral.stageCandidates.candidate[x].firstName.toUpperCase()}<br> Party: ${districtCandidatesGeneral.stageCandidates.candidate[x].party.toUpperCase()} PARTY<br> Status: ${districtCandidatesGeneral.stageCandidates.candidate[x].status}`;
        nextGeneralList.appendChild(candidate);
    }

    document.getElementById("main").appendChild(nextGeneralList);
}

//----------------------------------------------------------------------

let geocodioAPIKey = "789c52982879780b2ab22e775c79899bb578c25";
let fecAPIKey = "G2GcVatldeVNYrmcgrogA6DRyQWhCBQOoDU7qVC9";
let currentDate = new Date();

let userGeneralPoliticalGeoData = {};
let userHouseRepProfile = {};
let nextCandidates = {};
let nextElections = {};
let electionVoteSmartIds = {};
let districtCandidatesPrimary = {};
let districtCandidatesGeneral = {};




retrieveAllData();
























/*
let retrieveRepresentativesData = (retrievedZipCode) => {
    axios.get(`https://whoismyrepresentative.com/getall_mems.php?zip=${retrievedZipCode}&output=json`)
        .then((response) => {
            console.log(response);
            representativesData = response;
        })
        .catch((error)=> {
            console.log(error);
    });
}*/
//------------------------USE GOOGLE GEOCODE API TO GET ZIP CODE FROM LAT LONG
/* 
let retrieveLocationData = (position) => {
    let userData = {lat: position.coords.latitude, lng: position.coords.longitude};
    axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${userData.lat},${userData.lng}&key=AIzaSyCIny_pi_-OpegLTAf2iV4ebra20U62ciM`)
        .then((response)=> {
        for (let x = 0; x < response.data.results.length; x++) {
            for (let y = 0; y < response.data.results[x].address_components.length; y++) {
                if  (response.data.results[x].address_components[y].types.includes("postal_code")) {
                    //console.log(response.data.results[x]);
                    userData.zipCode = response.data.results[x].address_components[y].long_name;
                }
                if  (response.data.results[x].address_components[y].types.includes("administrative_area_level_1")){
                    //console.log(response.data.results[x]);
                    userData.state = response.data.results[x].address_components[y].short_name;
                }
            }
        }
        console.log(userData);
        retrieveRepresentativesData(userData.zipCode);
        })
        .catch((error)=> {
        console.log(error);
    });
}
*/