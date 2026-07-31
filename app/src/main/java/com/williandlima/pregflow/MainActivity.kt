package com.williandlima.pregflow

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.williandlima.pregflow.ui.navigation.PregFlowNavHost
import com.williandlima.pregflow.ui.theme.PregFlowTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PregFlowTheme {
                PregFlowNavHost()
            }
        }
    }
}
