const isEmpty = (string) => {
  if(string.trim() === '') return true
  else return false 
}

export const reduceUserDetails = ({ bio, website, location}) => {
  let userDetails = {};

  if(!isEmpty(bio.trim())) userDetails.bio = bio
  if(!isEmpty(website.trim())){
    userDetails.website = website
  }
  if(!isEmpty(location.trim())) userDetails.location = location

  return userDetails;
}