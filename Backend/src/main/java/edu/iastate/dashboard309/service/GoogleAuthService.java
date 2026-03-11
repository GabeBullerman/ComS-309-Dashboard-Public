package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;

import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;


@Service
public class GoogleAuthService {

    private final UserRepository userRepository;
    
    /*
        Client IDs in order:
        Web
        Android
        iOS
    */
    private static final List<String> CLIENT_IDS = List.of(
        "124195890479-kh157q1foah7sc96ckjbvdvrdt9esu0q.apps.googleusercontent.com",
        "124195890479-a2kov09e17k3bs73unu1g2u81bgd5ei8.apps.googleusercontent.com",
        "124195890479-ajdf86d36ik5mfv6262ujrlga2ghrail.apps.googleusercontent.com"
    );

    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;

        JsonFactory jsonFactory = GsonFactory.getDefaultInstance();
        NetHttpTransport transport = new NetHttpTransport();

        this.verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                .setAudience(CLIENT_IDS)
                .build();
    }

    public User authenticate(String idTokenString) throws Exception{
        GoogleIdToken idToken = verifier.verify(idTokenString);

        if (idToken == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Token could not be verified");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();

        String googleId = payload.getSubject();
        String netid = payload.getEmail().split("@")[0];

        return userRepository.findByGoogleId(googleId)
                .orElseGet(() -> linkGoogleUser(googleId, netid));
    }

    @Transactional
    public User linkGoogleUser(String googleId, String netid){
        User user = userRepository.findByNetid(netid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        user.setGoogleId(googleId);
        userRepository.save(user);
        return user;
    }
}
